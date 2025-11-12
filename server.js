const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const app = express();
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'nautica_secret_change_me', resave: false, saveUninitialized: false, cookie: { secure: false } }));
const DATA_FILE = path.join(__dirname, 'produtos.json');
function readProducts(){ try{ return JSON.parse(fs.readFileSync(DATA_FILE)); }catch(e){ return []; } }
function writeProducts(data){ fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8'); }
app.use(express.static(path.join(__dirname, 'public')));
app.use('/painel', express.static(path.join(__dirname, 'painel')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'nautica2025';
let ADMIN_HASH = process.env.ADMIN_PASS_HASH || null;
(async ()=>{ if(!ADMIN_HASH){ ADMIN_HASH = await bcrypt.hash(ADMIN_PASS, 10); } })();
function requireAuth(req,res,next){ if(req.session && req.session.user) return next(); res.status(401).json({ error:'unauth' }); }
app.post('/auth/login', async (req,res)=>{
  const { user, pass } = req.body || {};
  if(user !== ADMIN_USER) return res.status(401).json({ ok:false, error:'invalid' });
  const match = await bcrypt.compare(pass, ADMIN_HASH);
  if(!match) return res.status(401).json({ ok:false, error:'invalid' });
  req.session.user = user;
  res.json({ ok:true });
});
app.post('/auth/logout', (req,res)=>{ req.session.destroy(()=>res.json({ ok:true })); });
app.get('/auth/me', (req,res)=>{ if(req.session && req.session.user) return res.json({ user: req.session.user }); res.status(401).json({ error:'unauth' }); });
// products API
app.get('/api/produtos', (req, res) => {
  try {
    const dados = readProducts(); // sua função readProducts()
    res.json(dados);
  } catch (err) {
    res.status(500).json([]);
  }
});
app.get('/api/produtos/:id', (req,res)=>{ const id=Number(req.params.id); const p=readProducts().find(x=>x.id===id); if(!p) return res.status(404).json({error:'not found'}); res.json(p); });
app.post('/api/produtos', requireAuth, (req,res)=>{
  const list=readProducts();
  const nextId = list.reduce((m,x)=>Math.max(m,x.id),0)+1;
  const item = { id: nextId, nome: req.body.nome || 'Sem nome', preco: req.body.preco||0, estoque: req.body.estoque||0, imagens: req.body.imagens||[], imagem: (req.body.imagens&&req.body.imagens[0])||'', categoria: req.body.categoria||'novo', descricao: req.body.descricao||'', whatsappClicks:0 };
  list.push(item); writeProducts(list); res.json({ok:true,item});
});
app.put('/api/produtos/:id', requireAuth, (req,res)=>{
  const id=Number(req.params.id); const list=readProducts(); const idx=list.findIndex(x=>x.id===id);
  if(idx===-1) return res.status(404).json({error:'not found'}); list[idx] = { ...list[idx], ...req.body }; writeProducts(list); res.json({ok:true});
});
app.delete('/api/produtos/:id', requireAuth, (req,res)=>{
  const id=Number(req.params.id); let list=readProducts(); list = list.filter(x=>x.id!==id); writeProducts(list); res.json({ok:true});
});
// click analytics (increment whatsapp clicks)
app.post('/api/produtos/:id/click', (req,res)=>{
  const id=Number(req.params.id); const list=readProducts(); const idx=list.findIndex(x=>x.id===id);
  if(idx===-1) return res.status(404).json({error:'not found'}); list[idx].whatsappClicks = (list[idx].whatsappClicks||0)+1; writeProducts(list); res.json({ok:true, clicks:list[idx].whatsappClicks});
});
// upload files (store in uploads/)
const basicUpload = multer({ storage: multer.diskStorage({ destination: function(req,file,cb){ const d=path.join(__dirname,'uploads'); if(!fs.existsSync(d)) fs.mkdirSync(d); cb(null,d); }, filename:function(req,file,cb){ cb(null, Date.now()+'-'+file.originalname.replace(/\s+/g,'_')); } }) });
app.post('/api/upload', requireAuth, basicUpload.array('files', 12), (req,res)=>{
  try{ const urls = req.files.map(f=>'/uploads/'+path.basename(f.path)); res.json({ok:true, urls}); }catch(err){ res.status(500).json({ok:false,error:err.message}); }
});
// simple checkout mock
app.post('/checkout', (req,res)=>{ const items = req.body.items || []; if(items.length===0) return res.status(400).json({error:'empty'}); return res.json({ok:true,checkoutUrl:'/mock-checkout.html'}); });
app.get('/login', (req,res)=>{ res.sendFile(path.join(__dirname,'public','login.html')); });
// healthcheck simples (útil para Render)
app.get('/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (env=${process.env.NODE_ENV || 'dev'})`);
});

// security & performance middlewares
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
app.use(helmet());
app.use(compression());
app.set('trust proxy', 1);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
const limiter = rateLimit({ windowMs: 15*60*1000, max: 200 });
app.use(limiter);

// multer seguro
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safe = Date.now() + '-' + file.originalname.replace(/[^\w.-]/g, '_');
      cb(null, safe);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Invalid file type'), ok);
  }
});

// ensure data file exists
if (!fs.existsSync(DATA_FILE)) writeProducts([]);
