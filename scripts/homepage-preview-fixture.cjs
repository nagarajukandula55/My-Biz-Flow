// Synthetic catalog only; never loads environment files or uses a remote database.
const {PrismaClient}=require('@prisma/client');
if(process.env.MBF_ISOLATED_TEST!=='1'||process.env.DATABASE_URL!=='postgresql://ci:ci@127.0.0.1:55439/ci')throw Error('Disposable local database required');
const load=require('../tests/loadModule.cjs');
const modules=load('src/lib/designer/modules.ts').MODULES.filter(m=>m.slug!=='accounting-gst');
const ids=modules.map(m=>'homepage-qa-'+m.slug);
const db=new PrismaClient();
async function main(){
 if(process.argv.includes('--clean')){
  await db.partnerType.deleteMany({where:{id:{in:ids}}});
  console.log('Removed synthetic homepage catalog only.');return;
 }
 await db.partnerType.createMany({data:modules.map(m=>({id:'homepage-qa-'+m.slug,status:'Active',description:m.slug==='accounting'?'Accounting & GST':m.label,defaultModules:m.slug==='accounting'?['accounting','accounting-gst','billing']:[m.slug],idPrefix:'HOMEQA'}))});
 console.log('Created 25 synthetic signup offerings for local homepage verification.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
