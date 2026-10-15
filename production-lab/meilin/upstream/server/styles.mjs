// Global style sources for 美林: overseas presets, FG canvas style library, uploaded references, FG inspiration library.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCOPE = '【使用边界】本规范是全剧美术与影像基线，统一角色资产、服装材质、空间世界观、色彩语言和成片质感；具体构图、景别、机位、运镜、动作和单场光线由分段导演决定，不得机械复制。';

const faces = '【角色设计系统】演员面孔按目标市场：以欧美白人为主，按角色设定可混合非裔、拉丁裔与亚裔；骨相、年龄、肤色与发质真实可信，保留毛孔、细纹与微表情；禁止统一网红脸、过度磨皮与跨集年龄漂移。';

// Overseas presets reuse FG style-library frames as preview images (the frames were shot for domestic presets).
export const OVERSEAS = [
  {
    id: 'os-urban-luxe', title: '北美都市豪门', image: 'urban-live-action.jpg', film: 'Kodak Vision3 250D', palette: ['#1f1c1a', '#b9925c', '#efe6d6', '#5b2330'],
    description: '酒店宴会厅、顶层公寓与董事会议室；暖金主光、真实材质，像院线爱情片。', tags: ['豪门', '逆袭', '婚恋'],
    prompt: ['【项目定位】北美都市豪门题材竖屏短剧的写实院线质感，视觉核心是可信的财富空间、精致但不浮夸的服化道和克制的表演。', faces,
      '【项目色彩系统】60% 象牙白、暖灰、胡桃木与大理石色，30% 深海军蓝、炭灰与驼色，10% 香槟金与酒红作为权力与情绪强调。',
      '【服饰与材质】高级定制西装、缎面礼服、羊绒大衣、真丝衬衫；金属、玻璃、大理石、皮革保持真实粗糙度与反射，不出现真实品牌 Logo。',
      '【空间世界观】五星酒店宴会厅、曼哈顿式顶层公寓、玻璃幕墙会议室、私人会所与车库；尺度、家具系统与英文环境信息符合北美语境。',
      '【影像与光线】暖金实景光源为主，窗光与吊灯构成主光方向，适中对比；镜头稳定、运动有动机，不滥用慢动作。',
      '【全局禁用】廉价影楼光、塑料皮肤、强烈青橙滤镜、过饱和、可读品牌文字、空洞样板间。', SCOPE].join('\n'),
  },
  {
    id: 'os-revenge-noir', title: '复仇悬疑夜色', image: 'suspense-noir.jpg', film: 'Kodak Vision3 500T', palette: ['#0b1118', '#2a3a4a', '#c9a36a', '#8c1c2a'],
    description: '蓝黑低照度、真实城市夜景与少量危险色，服务复仇与身份反转。', tags: ['复仇', '悬疑', '反转'],
    prompt: ['【项目定位】北美城市夜景复仇悬疑短剧的写实暗调体系，以低照度、湿润街面与心理压迫为母题，但人物与关键信息始终可读。', faces,
      '【项目色彩系统】65% 蓝黑、炭灰与冷水泥色，25% 钠灯琥珀与屏幕冷白，10% 暗红作为危险与线索强调。',
      '【服饰与材质】深色哑光风衣、皮夹克、职业套装；雨水、玻璃、金属与旧砖墙保持真实湿润反射。',
      '【空间世界观】雨夜街区、停车场、警局走廊、律所办公室、旧公寓楼梯间，同属一座北美城市。',
      '【影像与光线】实景光源可解释，低调但不黑死；镜头偏观察与跟随，揭示有节奏。',
      '【全局禁用】黑成不可读、霓虹灯海、过量烟雾、血浆猎奇、反派脸谱化。', SCOPE].join('\n'),
  },
  {
    id: 'os-neon-mafia', title: '霓虹黑帮', image: 'cyberpunk-neon.jpg', film: 'Cinestill 800T', palette: ['#0c0a1a', '#ff3d81', '#2fd1ff', '#ffb000'],
    description: '湿地面反光、品红与青色霓虹，黑帮、地下拳场与危险爱情。', tags: ['黑帮', '危险爱情', '夜生活'],
    prompt: ['【项目定位】都市黑帮与危险爱情题材的霓虹夜景，强调欲望、权力与危险，但保持写实人物与可信空间。', faces,
      '【项目色彩系统】55% 深紫黑与沥青色，30% 品红与青色霓虹，15% 琥珀金作为人物肤色与权力点缀。',
      '【服饰与材质】黑色西装、皮革、丝绒、金属首饰；霓虹在湿地面与皮革上形成可信反射。',
      '【空间世界观】夜店后巷、地下拳场、赌场包厢、码头仓库与顶层俱乐部。',
      '【影像与光线】霓虹为实景光源，人物面部保留柔和补光；运动摄影克制，冲突时允许短促手持。',
      '【全局禁用】无来源发光、全屏霓虹、塑料皮肤、可读品牌与招牌文字。', SCOPE].join('\n'),
  },
  {
    id: 'os-classic-noir', title: '黑白黑色电影', image: 'black-white-noir.jpg', film: 'Kodak Double-X 5222', palette: ['#0a0a0a', '#4a4a4a', '#bdbdbd', '#f2f2f2'],
    description: '高反差黑白、百叶窗光影与烟雾，适合复古侦探与回忆段落。', tags: ['黑色电影', '复古', '回忆'],
    prompt: ['【项目定位】经典黑色电影的黑白影像体系，用硬光、阴影与几何构图建立宿命感。', faces,
      '【项目色彩系统】纯黑白影像，保留完整灰阶；高光干净、暗部有层次。',
      '【服饰与材质】风衣、礼帽、丝袜、烟草与旧木家具，材质靠光影体现。',
      '【空间世界观】侦探事务所、雨夜街灯、旧酒店走廊、警局审讯室。',
      '【影像与光线】硬质主光与百叶窗投影，低机位与对角线构图，节奏冷静。',
      '【全局禁用】彩色溢出、平光、现代电子屏幕、过度颗粒糊画面。', SCOPE].join('\n'),
  },
  {
    id: 'os-real-life', title: '生活写实纪实', image: 'real-life.jpg', film: 'Kodak Portra 400', palette: ['#2b2a26', '#8a7a62', '#e8dcc6', '#5f7a86'],
    description: '自然光、真实家庭与职场空间，情感剧与家庭剧的可信质感。', tags: ['家庭', '情感', '职场'],
    prompt: ['【项目定位】北美家庭与职场情感短剧的纪实写实质感，靠真实生活痕迹与细腻表演打动观众。', faces,
      '【项目色彩系统】自然中性色为主，暖白窗光、木色家具与低饱和蓝灰点缀。',
      '【服饰与材质】日常针织、牛仔、衬衫与工作服，保留褶皱与使用痕迹。',
      '【空间世界观】郊区独栋住宅、厨房、医院、学校、咖啡馆与小办公室。',
      '【影像与光线】自然窗光与室内实景灯，轻微手持呼吸感，表演优先。',
      '【全局禁用】广告式精致、过度暖黄、空洞样板间、表演夸张。', SCOPE].join('\n'),
  },
  {
    id: 'os-dark-fantasy', title: '暗黑奇幻 · 狼人与吸血鬼', image: 'surreal-dream.jpg', film: 'Cinestill 800T', palette: ['#06101c', '#1d3b5a', '#7aa6c9', '#7a1f2b'],
    description: '冷蓝月夜、古堡与森林，狼人、吸血鬼与命定伴侣题材。', tags: ['狼人', '吸血鬼', '奇幻'],
    prompt: ['【项目定位】狼人与吸血鬼奇幻浪漫短剧，写实人物置于冷蓝月夜与古老家族空间中，奇观服务于身份与命运。', faces,
      '【项目色彩系统】60% 冷蓝与墨黑，25% 月光银灰，15% 血红与琥珀眼瞳作为种族与情绪强调。',
      '【服饰与材质】皮革、粗呢、丝绒长裙、古董银饰；毛发与雾气有真实体积。',
      '【空间世界观】松林、月下湖畔、哥特古堡、家族议事厅与小镇酒吧。',
      '【影像与光线】月光为主光，烛火与火把为暖色补光；变身与能力表现有物理过程。',
      '【全局禁用】廉价 CG 质感、全屏蓝滤镜、恐怖血腥、卡通化狼形。', SCOPE].join('\n'),
  },
  {
    id: 'os-sci-fi', title: '近未来科幻', image: 'future-tech.jpg', film: 'ARRI Alexa 65 数字', palette: ['#0a0f14', '#9fb3c8', '#e9eef2', '#3fd1c7'],
    description: '功能性科技空间、冷白与单一能源色，AI、克隆与未来都市题材。', tags: ['科幻', 'AI', '未来都市'],
    prompt: ['【项目定位】近未来科幻短剧，技术规则清晰、空间功能可信，奇观反映文明尺度。', faces,
      '【项目色彩系统】60% 冷白与银灰，30% 深空黑，10% 青绿能源色。',
      '【服饰与材质】功能性制服、模块化外套、哑光金属与磨砂玻璃。',
      '【空间世界观】科技公司实验室、自动化公寓、磁浮车站与数据中心。',
      '【影像与光线】面光源与屏幕光为主，干净高光，运动平稳精确。',
      '【全局禁用】无功能 HUD、随机霓虹、现实品牌、技术规则漂移。', SCOPE].join('\n'),
  },
  {
    id: 'os-retro-film', title: '复古胶片浪漫', image: 'retro-hong-kong.jpg', film: 'Kodak Ektachrome E100', palette: ['#2a1e1a', '#c4683a', '#f2c879', '#2f5d62'],
    description: '暖橘与青绿撞色、浓郁胶片颗粒，年代爱情与重逢题材。', tags: ['年代', '浪漫', '重逢'],
    prompt: ['【项目定位】复古胶片质感的浪漫短剧，以浓郁色彩、怀旧空间与含蓄表演建立情绪。', faces,
      '【项目色彩系统】暖橘、琥珀与青绿形成撞色，暗部偏青，高光偏暖。',
      '【服饰与材质】复古衬衫、高腰长裙、皮质夹克、旧收音机与唱片。',
      '【空间世界观】海边公路、汽车旅馆、老式餐厅、天台与旧唱片店。',
      '【影像与光线】黄昏逆光与霓虹招牌混合，轻微手持与慢推，保留胶片颗粒。',
      '【全局禁用】数码锐化、过饱和、现代手机屏幕、错误年代物件。', SCOPE].join('\n'),
  },
].map((s) => ({ ...s, source: 'overseas', image: `/styles/${s.image}` }));

const raw = JSON.parse(readFileSync(join(HERE, 'fg', 'fg-style-library.json'), 'utf8'));
export const FG_LIBRARY = raw.map((s) => ({ ...s, source: 'fg-library', image: `/styles/${s.image}` }));

export const allPresets = () => [...OVERSEAS, ...FG_LIBRARY];
export const findPreset = (id) => allPresets().find((s) => s.id === id);

export function styleFromPreset(p) {
  return { source: p.source, id: p.id, title: p.title, description: p.description, image: p.image, prompt: p.prompt, palette: p.palette || [], film: p.film || '', references: [], tags: p.tags || [] };
}

// Mock decode from uploaded references: only the palette sampled in the browser is real.
export function styleFromPaletteMock(refs, palette, note = '') {
  const hex = palette.slice(0, 5);
  return {
    source: 'upload', id: `upload-${Date.now()}`, title: '我的参考图画风', description: `由 ${refs.length} 张参考图提取（模拟解析：仅提取色板）`,
    image: refs[0]?.url || '', palette: hex, film: '', references: refs, tags: ['上传参考'], simulated: true,
    prompt: [
      `【画风来源】成员上传的 ${refs.length} 张参考图。模拟模式只提取了色板；接入主模型后由 ZY Dream Decode 解析媒介、光线、镜头与质感并写成完整规范。`,
      `【项目色彩系统】主色板 ${hex.join('、')}，按参考图中的面积比例分配，暗部与高光倾向保持一致。`,
      faces,
      note ? `【成员补充】${note}` : '',
      '【参考图用途】参考图只提供画风与色彩，不继承其中的人物、文字、品牌与具体场景。',
      SCOPE,
    ].filter(Boolean).join('\n'),
  };
}

export const STYLE_SCOPE = SCOPE;
