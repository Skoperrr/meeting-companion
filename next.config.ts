import type { NextConfig } from 'next';
import path from 'node:path';
const config:NextConfig={
 webpack(config,{webpack}){
  if(process.env.NATIVE_NEXT==='1') config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/,path.resolve(process.cwd(),'lib/no-workers.ts')));
  return config;
 },
 turbopack:process.env.NATIVE_NEXT==='1'?{resolveAlias:{'cloudflare:workers':'./lib/no-workers.ts'}}:{}
};
export default config;
