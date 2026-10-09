import sqlite3,json,unittest
from pathlib import Path
class Persistence(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  for migration in sorted(Path('drizzle').glob('*.sql')):self.db.executescript(migration.read_text())
  self.tasks=json.loads(Path('test-data/expected.json').read_text())['proposed_tasks']
  self.db.execute("INSERT INTO meetings VALUES (?,?,?,?,?,?,?,?)",('m','Sync','2026-10-09','transcript', '{}','pending','fixture','now'));self.db.commit()
 def approve(self,indices):
  with self.db:
   for i in indices:
    t=self.tasks[i]
    self.db.execute("INSERT INTO tasks (id,meeting_id,proposal_index,title,description,assigned_to,due_date,priority,status,transcript_quote,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,'To Do',?,?,? WHERE EXISTS (SELECT 1 FROM meetings WHERE id=? AND review_state='pending')",(f'm:{i}','m',i,t['title'],t['description'],t['assigned_to'],t['due_date'],t['priority'],t['transcript_quote'],'now','now','m'))
   self.db.execute("UPDATE meetings SET review_state='approved' WHERE id=? AND review_state='pending'",('m',))
 def test_selective_idempotent_approval(self):
  self.approve([0,2]);self.approve([0,1,2]);self.assertEqual(self.db.execute('SELECT proposal_index FROM tasks ORDER BY proposal_index').fetchall(),[(0,),(2,)])
 def test_empty_approval(self):
  self.approve([]);self.assertEqual(self.db.execute('SELECT count(*) FROM tasks').fetchone()[0],0);self.assertEqual(self.db.execute('SELECT review_state FROM meetings').fetchone()[0],'approved')
 def test_rollback(self):
  with self.assertRaises(sqlite3.IntegrityError):self.approve([0,0])
  self.assertEqual(self.db.execute('SELECT count(*) FROM tasks').fetchone()[0],0);self.assertEqual(self.db.execute('SELECT review_state FROM meetings').fetchone()[0],'pending')
 def test_status_persists(self):
  self.approve([0]);self.db.execute("UPDATE tasks SET status=? WHERE id=?",('Blocked','m:0'));self.db.commit();self.assertEqual(self.db.execute('SELECT status FROM tasks').fetchone()[0],'Blocked')
unittest.main()
