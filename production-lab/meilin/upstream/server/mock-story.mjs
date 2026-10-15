// Sample production used in 模拟模式. Everything here is illustrative content written for the prototype.

export const SAMPLE_BRIEF = {
  premise: 'A bride is dumped at the altar for an heiress, then calmly reveals she just bought the groom\'s company.',
  premiseZh: '新娘在婚礼上被当众抛弃，新郎挽着千金进场；她平静地摘下戒指：我刚买下了你的公司。',
  genre: '豪门逆袭 / 身份反转',
  market: '北美（ReelShort / DramaBox 受众）',
  language: '英文台词，括号附中文意思',
  episodes: 30,
  episodeSeconds: 90,
  protagonist: 'Ava Mercer：被抛弃的新娘，隐藏身份是 Mercer 家族继承人',
  questions: [
    { id: 'market', q: '目标市场和台词语言？', options: ['北美 · 英文', '东南亚 · 英文', '拉美 · 西语'], pick: 0 },
    { id: 'length', q: '集数和单集时长？', options: ['30 集 × 90 秒', '50 集 × 60 秒', '20 集 × 120 秒'], pick: 0 },
    { id: 'tone', q: '女主的反击方式？', options: ['冷静碾压，一句话翻盘', '先隐忍后爆发', '边哭边反杀'], pick: 0 },
  ],
};

export const SAMPLE_BIBLE = {
  title: 'The Bride Who Bought Him',
  titleZh: '新娘买下了他',
  logline: 'Dumped at the altar for an heiress, a "nobody" bride reveals she owns the groom\'s company, and the family that mocked her starts to fall.',
  loglineZh: '在婚礼上被抛弃的"无名新娘"，当众亮出收购书；嘲笑她的豪门一家开始崩塌。',
  styleId: 'os-urban-luxe',
  faces: '欧美白人为主（Ava、Ethan、Vivian、Margaret），Daniel 为非裔美国人，Lucas 为拉丁裔',
  performance: '生活化写实；Ava 情绪克制、语速慢、几乎不眨眼；反派表情外放但不夸张',
  rules: ['每集开头 3 秒内必须出现冲突或台词钩子', 'Ava 全剧不哭', '不出现真实品牌、Logo、真人', '无血腥、无性暗示'],
  cast: [
    { code: '@角色1', key: 'A', name: 'Ava Mercer', zh: '艾娃', age: 26, look: '栗色长发低盘发、灰色眼睛、象牙白缎面一字肩婚纱', role: '女主，被抛弃的新娘，隐藏身份 Mercer 家族继承人' },
    { code: '@角色2', key: 'B', name: 'Ethan Cole', zh: '伊森', age: 29, look: '深金色背头、浅蓝眼睛、藏青色塔士多礼服、白色口袋巾', role: '新郎，Cole Dynamics CEO' },
    { code: '@角色3', key: 'D', name: 'Vivian Hart', zh: '薇薇安', age: 25, look: '铂金色齐下巴短发、红色亮片吊带长裙、钻石耳坠', role: 'Hart 集团千金，Ethan 的新欢' },
    { code: '@角色4', key: 'E', name: 'Margaret Cole', zh: '玛格丽特', age: 55, look: '银灰色低发髻、三层珍珠项链、墨绿色丝绒长裙', role: 'Ethan 的母亲' },
    { code: '@角色5', key: 'F', name: 'Daniel Brooks', zh: '丹尼尔', age: 45, look: '非裔美国人，短发鬓角微白，金丝眼镜，炭灰色三件套西装', role: 'Ava 的律师' },
    { code: '@角色6', key: 'G', name: 'Lucas Vance', zh: '卢卡斯', age: 32, look: '拉丁裔，黑色短寸头，黑色西装黑衬衫，左耳透明耳麦', role: 'Ava 的幕僚长' },
  ],
};

export const SCRIPT_SONNET_EP1 = `# The Bride Who Bought Him / 新娘买下了他
## 第1集《Keep the Ring》 时长约 90 秒
【本集钩子】婚礼进行曲停下，新郎挽着另一个女人走进来："I'm not marrying you, Ava."
【出场人物】
Ava Mercer｜26｜栗色低盘发、灰色眼睛、象牙白缎面婚纱｜被抛弃的新娘，隐藏身份 Mercer 家族继承人
Ethan Cole｜29｜深金色背头、藏青塔士多｜新郎，Cole Dynamics CEO
Vivian Hart｜25｜铂金短发、红色亮片长裙｜Hart 集团千金，Ethan 的新欢
Margaret Cole｜55｜银发低髻、珍珠项链、墨绿丝绒长裙｜Ethan 的母亲
Daniel Brooks｜45｜金丝眼镜、炭灰三件套、黑色文件夹｜Ava 的律师
Lucas Vance｜32｜黑西装、耳麦｜Ava 的幕僚长
【场景】Halcyon 宴会厅｜傍晚｜晴｜水晶吊灯下的婚礼仪式区，白玫瑰拱门，红毯两侧宾客席，右侧香槟塔，正对拱门是双开大门
【正文】
场1 · Halcyon 宴会厅 · 傍晚
（动作）婚礼进行曲戛然而止。双开大门打开，Ethan 挽着 Vivian 走上红毯，宾客纷纷回头。
Ethan：I'm not marrying you, Ava.（我不会娶你，Ava。）
（动作）宾客哗然。Ava 站在白玫瑰拱门下，捧花没有放下。
Vivian：Did you really think a nobody gets to be Mrs. Cole?（你真以为一个无名小卒能当 Cole 太太？）
Margaret：Take off the ring, dear. It was my mother's.（把戒指摘下来，亲爱的。那是我母亲的。）
（动作）Ava 低头看戒指，慢慢摘下，走到 Ethan 面前，把戒指放进他掌心。
Ava：You can keep the ring.（戒指你留着。）
（动作）Ethan 嘴角一挑。Ava 再靠近半步。
Ava：I just bought your company.（我刚买下了你的公司。）
（动作）全场安静。侧门打开，Daniel 拿着黑色文件夹走来。
Daniel：As of nine a.m., Mercer Holdings owns fifty-one percent of Cole Dynamics.（截至今早九点，Mercer 控股持有 Cole Dynamics 51% 的股份。）
（动作）Ethan 的手机连续震动，屏幕亮起。
Ethan：That's impossible.（这不可能。）
（动作）Vivian 冲上来扬手要扇 Ava。Ava 扣住她的手腕，顺势一拧，Vivian 踉跄撞进香槟塔，杯子成排倒下。
Ava：Careful. That dress was charged to my company.（小心点。那条裙子是记在我公司账上的。）
（动作）Ava 提起裙摆走下红毯。大门处，Lucas 慢慢鼓掌。
Lucas：Ms. Mercer, your car is here.（Mercer 女士，您的车到了。）
Ethan（OS）：Mercer... as in THE Mercers?（Mercer……那个 Mercer 家族？）
【结尾悬念】镜头停在 Ethan 僵住的脸上，门外黑色轿车的车灯扫进宴会厅。Ava 到底是谁？她为什么要嫁给他？`;

export const SCRIPT_AISTUDIO_EP1 = `# The Bride Who Bought Him / 新娘买下了他
## Episode 1 "Fifty-One Percent"  ~90s
【Hook】Ava (V.O.): On my wedding day, I lost a fiancé and gained a company.（我婚礼那天，失去了未婚夫，得到了一家公司。）
【Characters】
Ava Mercer | 26 | ivory gown, low chestnut bun | the bride
Ethan Cole | 29 | navy tux, slicked hair | the groom, CEO of Cole Dynamics
Vivian Hart | 25 | platinum bob, red sequins | heiress, Ethan's mistress
Margaret Cole | 55 | pearls, emerald velvet | Ethan's mother
Daniel Brooks | 45 | glasses, charcoal suit | Ava's lawyer
【Locations】Halcyon Grand Ballroom | dusk | clear | crystal chandeliers, white rose arch, champagne tower
【Script】
Scene 1 · Ballroom · dusk
(Action) The music cuts. Ethan walks in with Vivian on his arm.
ETHAN: Sorry, Ava. I found someone who actually matters.（抱歉，Ava。我找到了真正有分量的人。）
VIVIAN: Hart Group. Look it up, sweetie.（Hart 集团。去查查吧，亲爱的。）
MARGARET: The ring. Now.（戒指。现在就还。）
(Action) Ava slides the ring off and drops it into Ethan's champagne glass.
AVA: Congratulations. You two deserve each other.（恭喜。你们俩真是天生一对。）
(Action) Daniel steps in with a folder.
DANIEL: Mr. Cole, the board meeting is moved to tonight. The new majority owner insists.（Cole 先生，董事会改到今晚了。新的控股股东坚持。）
ETHAN: New owner? Who?（新股东？是谁？）
(Action) Ava turns at the door.
AVA: Me.（我。）
(Action) Vivian grabs Ava's arm; Ava twists free, Vivian falls into the champagne tower.
【Cliffhanger】Ethan's phone lights up: "MERCER HOLDINGS ACQUIRES COLE DYNAMICS". He looks up — Ava is gone.`;

export const SCRIPT_SONNET_EP2 = `# The Bride Who Bought Him / 新娘买下了他
## 第2集《The Board Meeting》 时长约 90 秒
【本集钩子】Ethan 冲进董事会议室，主位上坐着还穿着婚纱的 Ava："You're late, Mr. Cole."
【出场人物】
Ava Mercer、Ethan Cole、Margaret Cole、Lucas Vance（同第1集）
Harold Pierce｜62｜白发、灰色细格西装｜Cole Dynamics 董事
【场景】Cole Dynamics 董事会议室｜夜｜雨｜整面落地窗外是雨夜城市，长桌尽头一把高背皮椅
【正文】
场1 · 董事会议室 · 夜
（动作）门被推开。Ethan 喘着气站在门口，长桌两侧的董事同时看向他。主位的皮椅转过来，Ava 依旧穿着婚纱。
Ava：You're late, Mr. Cole.（你迟到了，Cole 先生。）
Ethan：Get out of my chair.（从我的椅子上起来。）
Harold：It's her chair now, Ethan. Sit down.（现在那是她的椅子了，Ethan。坐下。）
（动作）Margaret 推门进来，看到 Ava，脸色一变。
Margaret：This is a hostile takeover. I'll have my lawyers—（这是恶意收购，我会让我的律师——）
Ava：Your lawyers work for me since nine a.m.（从今早九点起，你的律师为我工作。）
（动作）Lucas 把一份文件滑到 Ethan 面前。
Lucas：Your resignation. Sign at the bottom.（你的辞职信。在最下面签字。）
（动作）Ethan 抓起钢笔，又停住，盯着 Ava。
Ethan：Why marry me? If you had all this—why?（为什么要嫁给我？你明明拥有这一切——为什么？）
Ava：Because three years ago, your family destroyed mine.（因为三年前，你们家毁了我家。）
【结尾悬念】Ava 起身离开，桌上留下一张旧照片：年轻的 Margaret 和一个与 Ava 长得极像的女人。`;

// Asset table: one-paragraph Chinese prompts following short-drama-asset-prompts,
// with the face rule switched to the bible (欧美面孔) for the overseas direction.
const charBase = '最高画质，杰作，超精细，柔和自然光，';
const charTail = '标准站立姿势，全身可见，从头到脚都在画面内，正常透视，50mm标准镜头，干净浅灰色棚拍背景，柔和均匀漫射光，正常身材比例。';
export const SAMPLE_ASSETS = [
  { code: '@角色1', kind: 'character', name: 'Ava Mercer', zh: '艾娃', palette: ['#f3e9da', '#8a5a3c', '#c9b8a6', '#3b2a22'],
    prompt: `${charBase}一位年轻美国女性，欧美面孔，高加索五官，26岁，冷静克制的豪门继承人气质，安静但压得住场，身高170，身形纤细挺拔，哑光妆效，自然白皙肤色，皮肤通透，无油光，不泛油，精致淡妆，豆沙色哑光唇，栗色长发盘成低发髻，耳侧留两缕自然碎发，细长平眉，杏仁眼，灰色眼睛，双眼都睁开，对称双眼，眼神平静直视镜头，挺直鼻梁，唇形薄而清晰，不笑，耳垂一对小颗珍珠耳钉，穿一件象牙白重磅缎面一字肩婚纱，胸口平直剪裁无亮片，腰线收紧，裙摆落地有自然垂坠褶皱，双手在身前握着一束白玫瑰捧花，左手无名指一枚祖母绿切割钻戒，${charTail}` },
  { code: '@角色2', kind: 'character', name: 'Ethan Cole', zh: '伊森', palette: ['#1d2a44', '#d9c38a', '#f2f2f2', '#6b7a99'],
    prompt: `${charBase}一位年轻美国男性，欧美面孔，高加索五官，29岁，自负的科技公司 CEO，体面但轻浮，身高185，肩宽腰窄，身形挺拔，哑光皮肤质感，自然肤色，无油光，不泛油，深金色头发向后梳成整齐背头，鬓角修短，浓眉，浅蓝色眼睛，双眼都睁开，对称双眼，眼神略带俯视，高鼻梁，下颌线清晰，嘴角一边微微上挑，穿一套藏青色塔士多礼服，戗驳领为同色缎面，白色礼服衬衫，黑色领结，胸袋一方白色口袋巾，下身同色西裤带缎面侧条，黑色漆皮牛津鞋，左手腕一块银色细表，一手插裤袋，${charTail}` },
  { code: '@角色3', kind: 'character', name: 'Vivian Hart', zh: '薇薇安', palette: ['#b3122e', '#f4ead5', '#2a0f14', '#e8c0c8'],
    prompt: `${charBase}一位年轻美国女性，欧美面孔，高加索五官，25岁，张扬骄纵的千金，美艳带攻击性，身高168，身形纤细，哑光妆效，冷白皮，无油光，不泛油，浓妆，正红色哑光唇，铂金色齐下巴波波短发，发尾内扣，细挑眉，上扬猫眼眼线，蓝绿色眼睛，双眼都睁开，对称双眼，眼神挑衅斜看镜头，小巧鼻子，饱满唇形，似笑非笑，耳垂一对长款钻石流苏耳坠，穿一件红色亮片细吊带长裙，V领，裙摆高开衩，亮片在光下细碎反光，脚踩裸色细高跟凉鞋，手拿一只银色小手包，${charTail}` },
  { code: '@角色4', kind: 'character', name: 'Margaret Cole', zh: '玛格丽特', palette: ['#1f3a2e', '#e9e4da', '#9a8f7a', '#4a3b2c'],
    prompt: `${charBase}一位美国中年女性，欧美面孔，高加索五官，55岁，老派豪门主母，优雅刻薄，身高165，身形清瘦，哑光妆效，自然肤色，可见细纹，无油光，不泛油，裸色哑光唇，银灰色头发梳成光滑低发髻，细眉，灰蓝色眼睛，双眼都睁开，对称双眼，眼神冷淡审视，鼻梁窄挺，薄唇紧抿，脖子戴一条三层白色珍珠项链，穿一件墨绿色丝绒长袖长裙，船领，腰部细金属扣腰带，脚踩黑色低跟尖头鞋，双手交叠在身前，${charTail}` },
  { code: '@角色5', kind: 'character', name: 'Daniel Brooks', zh: '丹尼尔', palette: ['#3a3d42', '#c9a227', '#e6e6e6', '#2b1f17'],
    prompt: `${charBase}一位美国中年男性，非裔美国人，45岁，沉稳的并购律师，可靠、话少，身高183，身形匀称，哑光皮肤质感，深棕色肤色，无油光，不泛油，黑色短发鬓角微白，修剪整齐的短胡须，深棕色眼睛，双眼都睁开，对称双眼，眼神镇定，戴一副细金属框金丝眼镜，不笑，穿一套炭灰色三件套西装，白衬衫，深酒红色领带，西装马甲扣齐，下身同色西裤，黑色系带皮鞋，右手拿一只黑色皮质文件夹，${charTail}` },
  { code: '@角色6', kind: 'character', name: 'Lucas Vance', zh: '卢卡斯', palette: ['#0e0e10', '#3c3c44', '#b8b8c0', '#7a6248'],
    prompt: `${charBase}一位年轻美国男性，拉丁裔，32岁，干练冷静的幕僚长兼安保负责人，身高186，肩宽，身形精瘦，哑光皮肤质感，健康小麦色，无油光，不泛油，黑色短寸头，浓眉，深棕色眼睛，双眼都睁开，对称双眼，眼神警觉，鼻梁挺直，下颌线利落，左耳一枚透明螺旋耳麦，穿一套黑色修身西装，黑色衬衫不打领带，领口扣到最上一颗，黑色西裤，黑色皮鞋，双手在身前自然交握，${charTail}` },
  { code: '@场景1', kind: 'scene', name: 'Halcyon 宴会厅 · 婚礼仪式区', zh: '宴会厅', palette: ['#2a1a10', '#b07a3c', '#f2d39a', '#f7f2ea'],
    prompt: '一座古典酒店宴会厅，长约四十米，挑高约九米，三盏大型水晶吊灯沿中轴排开，中轴铺一条深酒红色红毯，从正门双开胡桃木大门一直通到尽头的白玫瑰拱门，拱门下是两级大理石台阶的仪式台，红毯两侧各八排白色椅背的宾客席，椅背系香槟色缎带，红毯右侧靠墙立一座七层香槟塔，杯中酒液反光，左侧墙面是一排拱形落地窗，傍晚的金色斜阳从窗外照进来，在红毯上落下一格格长窗影，吊灯已经点亮，暖金光落在白玫瑰和大理石上，空气里有花香和香槟的微甜，安静得能听见吊灯水晶轻响，空镜无人，《了不起的盖茨比》式奢华对称构图，柯达Vision3 250D胶片，细颗粒，暖金色调，暗部偏深棕不死黑，高光柔和，24mm镜头，f/5.6，深景深，人物，人，人脸' },
  { code: '@场景2', kind: 'scene', name: 'Halcyon 酒店门廊 · 夜雨', zh: '门廊', palette: ['#0b1220', '#1f3b5a', '#ffcc88', '#9fb4c8'],
    prompt: '酒店正门外的弧形门廊车道，夜，细雨，石柱撑起的玻璃雨棚下是三级花岗岩台阶，台阶铺着湿亮的深红地毯，车道路面积水倒映着门廊的暖黄壁灯，一辆没有任何标志的黑色长轴距轿车停在台阶前，车门关着，雨刷静止，车灯开着两道白光穿过雨丝，门廊两侧修剪成球形的黄杨盆栽挂着水珠，远处街道一片蓝黑色，雨棚边缘的水连成细线落下，空气湿冷，能听到雨打玻璃和轮胎压过积水的声音，空镜无人，大卫·芬奇式冷静夜景，Cinestill 800T胶片，粗颗粒，暗部冷蓝，壁灯钠黄光晕扩散，35mm镜头，f/2.0，浅景深，人物，人，人脸' },
  { code: '@道具1', kind: 'prop', name: '传家祖母绿切割钻戒', zh: '婚戒', palette: ['#e8eef2', '#c0c6cc', '#f5e6b8', '#0a0a0a'],
    prompt: '一枚传家祖母绿切割钻石戒指，产品展示图，主石约三克拉，长方形阶梯切割，四爪铂金镶嵌，戒臂细窄，内侧刻着磨浅的花体字母 M.C.，戒臂有几十年佩戴留下的细微划痕，45度角悬浮展示，纯黑丝绒背景，顶部单束暖白光，钻石火彩清晰，铂金反光真实，微距级细节，柯达Portra 400胶片质感，细颗粒，100mm微距镜头，f/4，浅景深，负面提示词：手，人物，全新，塑料感，卡通。' },
  { code: '@道具2', kind: 'prop', name: '收购文件夹', zh: '文件夹', palette: ['#121212', '#2c2c2c', '#c9a227', '#f2efe8'],
    prompt: '一只黑色粒面牛皮文件夹，产品展示图，A4尺寸，约两指厚，边缘手工缝线，右下角压印一枚小小的金色字母 M 徽记，文件夹半开，露出一叠米白色厚纸文件和一枚金属回形针，首页只有排版整齐的模糊文字不可读，皮面边角有轻微使用磨损，45度角悬浮展示，深灰色背景，侧面柔光勾出皮革纹理，柯达Vision3 250D胶片质感，细颗粒，50mm镜头，f/4，浅景深，负面提示词：手，人物，可读文字，Logo，卡通。' },
  { code: '@道具3', kind: 'prop', name: 'Ethan 的手机', zh: '手机', palette: ['#0a0a0c', '#33343a', '#5fd1ff', '#ff5a5a'],
    prompt: '一部无品牌标识的黑色直板智能手机，产品展示图，窄边框，背面磨砂玻璃，三摄模组，屏幕亮起显示一条红色向下箭头的股价折线图和三条叠放的通知横幅，通知文字为不可读的模糊排版，屏幕右上角一道细微划痕，45度角悬浮展示，纯黑背景，屏幕自发光照亮边框，冷蓝反光，柯达Vision3 500T胶片质感，中等颗粒，50mm镜头，f/2.8，浅景深，负面提示词：手，人物，品牌Logo，可读文字，卡通。' },
];

// Assets that first appear in episode 2 (extracted when the episode's script is adopted).
export const EP2_NEW_ASSETS = [
  { code: '@角色7', kind: 'character', name: 'Harold Pierce', zh: '哈罗德', palette: ['#d8d4cc', '#6c6a66', '#b9b2a6', '#2d2b29'],
    prompt: `${charBase}一位美国老年男性，欧美面孔，高加索五官，62岁，老派董事会元老，审慎而有分量，身高180，身形微胖但挺直，哑光皮肤质感，自然肤色，可见老年斑与细纹，无油光，不泛油，白发向后梳整齐，浓白眉，灰蓝色眼睛，双眼都睁开，对称双眼，眼神沉稳审视，鼻梁宽直，嘴唇紧抿，穿一套灰色细格纹双排扣西装，浅蓝衬衫，深绿色领带，金色领带夹，下身同色西裤，棕色牛津鞋，左手握一支黑色钢笔，${charTail}` },
  { code: '@场景3', kind: 'scene', name: 'Cole Dynamics 董事会议室 · 雨夜', zh: '会议室', palette: ['#0d141c', '#2c3e50', '#c8b48a', '#7e8c99'],
    prompt: '一间位于摩天楼高层的董事会议室，夜，雨，长约十二米的深色胡桃木长桌居中，两侧各六把黑色皮质高背椅，桌尽头一把更高的主位皮椅背对整面落地窗，窗外是雨夜城市的模糊灯海，雨水沿玻璃斜向滑落，桌面倒映着顶部一排嵌入式暖白筒灯，桌上整齐摆放水杯、皮质文件夹和一台关着的投影遥控器，墙面是深色木饰面与一幅抽象油画，地毯吸音无声，空气里有冷气和纸张的味道，空镜无人，迈克尔·曼式冷峻都市夜景，柯达Vision3 500T胶片，中等颗粒，暗部冷蓝，桌面高光暖白，35mm镜头，f/2.8，中浅景深，人物，人，人脸' },
  { code: '@道具4', kind: 'prop', name: '褪色的旧合照', zh: '旧照片', palette: ['#d9c9a8', '#8a7458', '#3a2f24', '#f2ead8'],
    prompt: '一张褪色的旧彩色合照，产品展示图，约 4×6 英寸，相纸边缘泛黄卷曲，右下角有一道折痕，照片里是两位年轻女性在庄园草坪上并肩微笑的模糊身影（面部不清晰），背面朝下压出浅浅指印，45度角悬浮展示，深灰色背景，侧面暖光，相纸纹理与轻微划痕清晰，柯达Portra 160胶片质感，细颗粒，50mm镜头，f/4，浅景深，负面提示词：手，人物特写，可读文字，全新，卡通。' },
];

// Episode 1 segment plan. A=Ava B=Ethan D=Vivian E=Margaret F=Daniel G=Lucas; C is reserved for the camera.
export const SEGMENTS_EP1 = [
  {
    n: 1, seconds: 15, plotSeconds: 18, title: '他挽着别人进场', event: 'Ethan 挽着 Vivian 走上红毯，当众悔婚', ending: 'B、D 停在红毯前段，A 在拱门下未动', cast: ['A', 'B', 'D'], scene: '@场景1', props: ['@道具1'],
    opening: '开场', edit: '多镜头，3 个切点，每次切换都由视线或声音带出',
    narrative: '婚礼进行曲中 A 站在拱门下等待 → 音乐戛然而止、大门打开 → B 挽着 D 走上红毯 → B 当众说出悔婚台词 → 宾客哗然，A 没有后退，停在拱门下与 B 隔着红毯对视。',
    beats: [
      { t: '0—3', task: '等待中的新娘', act: 'A 站在白玫瑰拱门下的第一级台阶上，双手在腹前握着捧花，目光平视正门方向，呼吸平稳。', cam: '镜头 C 从红毯中段约 1.5 米高度缓慢推近 A，中景到中近景，背景拱门的白玫瑰轻微虚化。', bg: '两侧宾客坐着，前排一位老妇人用手帕按眼角；弦乐四重奏在左侧演奏。' },
      { t: '3—6', task: '音乐断，大门开', act: 'A 听到大门声，视线先移到门口，头随后转过约 10 度，肩膀不动。', cam: '切到正门方向：镜头 C 位于红毯尽头背对拱门，固定机位，双开大门从中间被推开，逆光勾出 B 与 D 的轮廓。', bg: '大提琴手停弓，宾客从近到远依次回头，椅子发出轻响。' },
      { t: '6—11', task: '他们走上红毯', act: 'B 挽着 D 匀速走上红毯，B 下巴微抬，视线越过宾客直接看向 A；D 贴着 B 的手臂，嘴角带笑地扫视左右宾客。', cam: '镜头 C 在红毯中轴后退跟拍，保持 B、D 双人中景，速度与步速一致；两人身后的门框逐渐变小。', bg: '宾客交头接耳，有人举起手机又放下；窗外金色斜阳在红毯上落下窗影。' },
      { t: '11—15', task: '当众悔婚', act: 'B 在红毯前段停步，松开 D 的手臂，抬手整理袖口后开口。说完后 B 不看宾客，只看 A。A 不后退，捧花没有放低，下颌微收。', cam: '切到 A 的过肩反打：镜头 C 位于 A 右后方肩部高度，前景是 A 虚化的肩线与发髻，焦点落在 B 脸上；台词结束后焦点缓慢转到 A 的侧脸。', bg: '宾客的低语在台词结束后炸开，前排有人捂住嘴。' },
    ],
    dialogue: [{ who: 'B', at: '12—14', line: "I'm not marrying you, Ava.", zh: '我不会娶你，Ava。' }],
    perf: { blink: 'A 在 B 说话期间不眨眼，台词结束后慢眨一次；B 正常眨眼。', gaze: 'B 全程盯 A；D 扫视宾客后落到 A 身上。', turn: 'A 只转头不转肩。', stop: 'B 在红毯前段停步，D 晚半步停下。', expr: 'A 面无表情、嘴唇闭合；B 轻蔑；D 带笑。', dual: 'B 说完后 D 偏头看 B 的侧脸。', prop: 'A 左手无名指的 @道具1 在捧花边缘反光。' },
    lock: { present: 'A（拱门下第一级台阶，画面纵深尽头，正面朝门）、B（红毯前段偏左，面朝 A）、D（B 右侧半步，面朝 A）', gaze: 'A 与 B 对视；D 看 A', props: '捧花在 A 手中；@道具1 在 A 左手无名指', env: '傍晚，吊灯已亮，窗外斜阳', mood: 'B 刚宣布悔婚，宾客哗然，A 未回应', lastShot: 'A 的过肩反打（焦点在 A 侧脸）' },
  },
  {
    n: 2, seconds: 15, plotSeconds: 14, title: '“无名小卒”', event: 'Vivian 嘲讽，Margaret 当众索回戒指', ending: 'A 低头看向戒指', cast: ['A', 'B', 'D', 'E'], scene: '@场景1', props: ['@道具1'],
    opening: '直接承接', edit: '多镜头，2 个切点；从上一段的过肩反打改为 D 的正面中近景起幅，避免同机位复制',
    narrative: '直接承接：B、D 停在红毯前段，A 在拱门下 → D 上前半步嘲讽 → 第一排的 E 起身，向 A 索回戒指 → A 低头看向左手的戒指。',
    beats: [
      { t: '0—4', task: 'Vivian 的嘲讽', act: 'D 从 B 右侧向前迈出半步，单手叉腰，下巴抬起，对 A 说台词，说到 "nobody" 时轻轻歪头。', cam: '镜头 C 在 D 正面偏左约 30 度，胸口高度，中近景，背景 B 半身虚化；轻微手持呼吸感。', bg: '宾客的低语压低下来，第二排有人侧身看热闹。' },
      { t: '4—8', task: '母亲起身', act: 'E 从红毯左侧第一排座位起身，先把手包放在椅面，再理顺裙摆，走到红毯边缘站定，面朝 A。', cam: '切到侧面：镜头 C 位于红毯右侧宾客席后，横移跟随 E 起身到站定，中景，前景是虚化的椅背缎带。', bg: '身边的宾客往后缩，为她让出位置。' },
      { t: '8—12', task: '索回戒指', act: 'E 双手交叠在身前，语气平静地说台词，说完向 A 伸出右手，掌心向上。', cam: '镜头 C 停在 E 的侧后方，越过 E 伸出的手看向远处台阶上的 A，焦点从 E 的手转到 A。', bg: 'B 双臂抱胸，看着 A，没有阻止。' },
      { t: '12—15', task: 'A 看向戒指', act: 'A 视线先落到 E 的手，再缓慢低头看向自己左手无名指的戒指，右手拇指轻轻碰了一下戒圈。', cam: '镜头 C 从 A 的正面中近景缓慢下摇到双手与捧花特写，@道具1 在吊灯下闪一下。', bg: '宾客全部安静下来，吊灯水晶轻响。' },
    ],
    dialogue: [
      { who: 'D', at: '1—4', line: 'Did you really think a nobody gets to be Mrs. Cole?', zh: '你真以为一个无名小卒能当 Cole 太太？' },
      { who: 'E', at: '8—11', line: "Take off the ring, dear. It was my mother's.", zh: '把戒指摘下来，亲爱的。那是我母亲的。' },
    ],
    perf: { blink: 'A 低头时自然眨眼一次；E 几乎不眨眼。', gaze: 'D 看 A；E 看 A；B 看 A。', turn: 'E 起身后先看 B 一眼再转向 A。', stop: 'E 在红毯边缘停住，不踏上红毯。', expr: 'D 得意；E 冷淡礼貌的微笑；A 平静。', dual: 'D 说完后挽回 B 的手臂。', prop: 'E 的珍珠项链随起身轻微晃动；@道具1 在特写中闪光。' },
    lock: { present: 'A（拱门下台阶）、B（红毯前段偏左，双臂抱胸）、D（挽着 B 右臂）、E（红毯左侧边缘，右手伸出）', gaze: 'A 低头看戒指；B、D、E 看 A', props: '@道具1 仍在 A 左手；捧花在 A 右臂弯', env: '同上一段', mood: '被索回戒指，A 尚未行动', lastShot: '双手与戒指特写' },
  },
  {
    n: 3, seconds: 15, plotSeconds: 20, title: '“我刚买下了你的公司”', event: 'Ava 还戒指，说出反转台词', ending: '双人近景，Ethan 的笑凝固', cast: ['A', 'B', 'D'], scene: '@场景1', props: ['@道具1'],
    opening: '直接承接', edit: '一镜到底，摄影机从 A 的手部特写拉开并跟随 A 走下台阶',
    narrative: '直接承接：A 低头看戒指 → 摘下戒指，把捧花递给身旁伴娘 → 走下台阶穿过红毯来到 B 面前 → 把戒指放进 B 掌心并说第一句 → B 轻笑，A 再近半步说出反转台词，B 的笑凝固。',
    beats: [
      { t: '0—4', task: '摘戒指', act: 'A 右手捏住戒圈，转动半圈后摘下；左手把捧花递给右后方的伴娘，伴娘双手接住。', cam: '镜头 C 从双手特写起幅，随 A 抬手缓慢拉开到中近景，焦点跟着戒指。', bg: '伴娘接花时愣了一下，拱门白玫瑰虚化在后。' },
      { t: '4—9', task: '走向他', act: 'A 提起裙摆一侧，步伐不快不慢走下两级台阶，沿红毯走向 B，视线始终在 B 脸上。', cam: '镜头 C 在 A 左前方倒退跟随，保持中景，A 的婚纱拖尾在红毯上滑动；走到 B 面前时镜头绕到两人侧面，形成双人侧面中景。', bg: '两侧宾客随 A 经过依次转头；D 抓紧 B 的手臂。' },
      { t: '9—12', task: '还戒指', act: 'A 停在 B 面前一臂距离，拉起 B 的右手，把戒指放进他掌心，再把他的手指合上，说第一句。B 低头看掌心后抬头，嘴角一挑。', cam: '镜头 C 在两人侧面胸口高度，焦点从两人交握的手上移到 B 的脸。', bg: 'D 在 B 身后露出半张脸，挑眉。' },
      { t: '12—15', task: '反转', act: 'A 向前再近半步，压低声音说出第二句。B 的笑停在嘴角，眼睛先睁大再眯起。A 说完不后退。', cam: '镜头 C 缓慢推近成双人近景，A 在画面左侧占前景三分之一，焦点落在 B 凝固的表情上。', bg: '背景宾客完全虚化，只剩吊灯光斑。' },
    ],
    dialogue: [
      { who: 'A', at: '10—11', line: 'You can keep the ring.', zh: '戒指你留着。' },
      { who: 'A', at: '13—14', line: 'I just bought your company.', zh: '我刚买下了你的公司。' },
    ],
    perf: { blink: 'A 说第二句时不眨眼；B 在听到第二句后连眨两次。', gaze: 'A 只看 B；B 先看掌心再看 A。', turn: '无大幅转身。', stop: 'A 停在 B 面前一臂距离。', expr: 'A 平静；B 从轻蔑的笑到僵住。', dual: 'A 合上 B 手指时，B 下意识握紧。', prop: '@道具1 在 B 掌心。' },
    lock: { present: 'A（画面左，面朝右，站在 B 面前一臂内）、B（画面右，面朝左）、D（B 身后偏右，半张脸可见）', gaze: 'A 与 B 对视', props: '@道具1 在 B 右手掌心；捧花在伴娘手中（拱门下）', env: '同上一段', mood: 'A 刚说出“我刚买下了你的公司”，B 震住', lastShot: '双人近景（侧面）' },
  },
  {
    n: 4, seconds: 15, plotSeconds: 15, title: '51%', event: '律师入场宣布收购，Ethan 手机报警', ending: 'Ethan 盯着手机，Vivian 在他身后怒视 Ava', cast: ['A', 'B', 'D', 'F'], scene: '@场景1', props: ['@道具2', '@道具3'],
    opening: '转场缓冲', edit: '多镜头，3 个切点；首镜为声音先入 + 第三人入场，避免从上一段的双人近景机械承接',
    narrative: '转场缓冲（上一段以双人近景结束）：先给侧门打开的声音和 F 的皮鞋走过大理石 → 再回到人物，按衔接锁复写站位 → F 宣布收购比例 → B 的手机连续震动，他看屏幕后说出“不可能” → D 在他身后怒视 A。',
    beats: [
      { t: '0—3', task: '声音先入：律师进场', act: 'F 推开宴会厅右侧的侧门，迈步走上大理石地面，右手拿着 @道具2，步速稳定。', cam: '镜头 C 低机位约 0.4 米，从 F 的皮鞋与裤脚起幅，随步伐上摇到腰部的文件夹，然后到他的脸。', bg: '侧门外是明亮的走廊，门缓慢自动合上。' },
      { t: '3—5', task: '回到众人', act: '按衔接锁站位：A 在画面左侧面朝 B，B 在画面右侧，D 在 B 身后偏右。三人同时转头看向侧门方向。', cam: '镜头 C 位于红毯右侧，三人中景，F 从画面右侧边缘入画。', bg: '宾客向侧门方向探头。' },
      { t: '5—10', task: '宣布收购', act: 'F 停在 A 右后方一步，打开文件夹，对 B 宣读台词，说完把文件夹首页转向 B。A 不回头，只微微侧耳。', cam: '镜头 C 越过 B 的右肩拍 F 与 A，F 在焦点上；台词结束后焦点拉到 B 的后脑与肩线。', bg: '前排有宾客站起来。' },
      { t: '10—15', task: '手机报警', act: 'B 的西装内袋连续震动，他掏出 @道具3，屏幕亮起红色下跌曲线。B 盯着屏幕，嘴唇动了一下才说出台词。D 在他身后抬眼，从屏幕看向 A，表情由惊转怒。', cam: '镜头 C 先给手机屏幕的过肩特写（不出现可读文字），再上摇到 B 的脸，最后焦点越过 B 的肩落到后面 D 怒视的眼睛。', bg: '宾客席里接连亮起手机屏幕的光。' },
    ],
    dialogue: [
      { who: 'F', at: '5—9', line: 'As of nine a.m., Mercer Holdings owns fifty-one percent of Cole Dynamics.', zh: '截至今早九点，Mercer 控股持有 Cole Dynamics 51% 的股份。' },
      { who: 'B', at: '13—14', line: "That's impossible.", zh: '这不可能。' },
    ],
    perf: { blink: 'B 看屏幕时连续快速眨眼；A 不眨眼。', gaze: 'F 看 B；B 看手机；D 看 A。', turn: 'A 不转身。', stop: 'F 停在 A 右后方一步。', expr: 'F 职业冷静；B 震惊；D 由惊转怒。', dual: 'D 的手从 B 的手臂上滑落。', prop: '@道具1 仍握在 B 左手（换手拿手机）；@道具2 打开在 F 手中；@道具3 在 B 右手。' },
    lock: { present: 'A（画面左，面朝右）、B（画面中，低头看手机）、D（B 身后偏右，盯 A，已松开 B）、F（A 右后方一步）', gaze: 'B 看手机；D 盯 A；A 看 B', props: '@道具1 在 B 左手；@道具3 在 B 右手；@道具2 打开在 F 手中', env: '同上一段，宾客手机光点', mood: 'D 的愤怒到达临界点', lastShot: 'D 的近景（越过 B 的肩）' },
  },
  {
    n: 5, seconds: 15, plotSeconds: 12, title: '扣腕', event: 'Vivian 扬手扇人被扣住手腕，撞倒香槟塔', ending: 'Vivian 坐倒在碎杯旁，Ava 站立', cast: ['A', 'D', 'B'], scene: '@场景1', props: [],
    opening: '直接承接', action: true, edit: '多镜头，武戏 4 拍，每拍 3–4 秒',
    narrative: '直接承接：D 越过 B 冲向 A → 扬手要扇，被 A 扣住手腕 → A 外旋下压推开，D 踉跄后退撞上香槟塔 → 塔倒，D 坐倒，A 说出台词。',
    beats: [
      { t: '0—3', task: '冲上来', act: 'D 从 B 身后绕出，两步冲到 A 面前，右手高高扬起，手掌张开，重心压在前脚。', cam: '镜头 C 在 A 左后方肩部高度，D 迎着镜头冲入画面，快速推近。', bg: 'B 下意识伸手想拉 D，没拉住。' },
      { t: '3—6', task: '扣腕', act: 'A 左手在 D 的手掌落下前扣住她的手腕，手臂停在半空，两人脸相距不到一尺；A 脚下不动。', cam: '切侧面：镜头 C 在两人侧面，中近景，D 被扣住的手腕在画面中心。', bg: '全场倒吸一口气，弦乐手抱紧琴。' },
      { t: '6—10', task: '外旋推开', act: 'A 把 D 的手腕向外一旋再向下压，顺势一推；D 失去平衡，后退三步，高跟鞋一崴，后背撞上香槟塔。', cam: '镜头 C 向右甩摇跟随 D 后退，D 的背影撞入塔身。', bg: '香槟塔顶层杯子先晃动。' },
      { t: '10—15', task: '塔倒与台词', act: '香槟塔从上到下成排倒落，酒液泼洒，D 坐倒在碎杯旁，裙摆被酒液打湿；A 收回手，把一缕散落的碎发别到耳后，说台词。', cam: '镜头 C 先给塔倒的中景（D 在下方），再切到 A 的低角度中近景，A 俯视画面外的 D。', bg: '宾客从香槟塔周围后退，几只杯子在大理石上滚动。' },
    ],
    dialogue: [{ who: 'A', at: '12—14', line: 'Careful. That dress was charged to my company.', zh: '小心点。那条裙子是记在我公司账上的。' }],
    perf: { blink: 'A 扣腕瞬间不眨眼；D 撞塔时紧闭双眼后睁开。', gaze: 'A 全程看 D。', turn: 'A 只转动手腕和肩，下盘不动。', stop: 'D 撞塔后坐倒。', expr: 'A 冷静；D 从愤怒到狼狈。', dual: 'B 在背景里僵住，手还伸在半空。', prop: '香槟杯与酒液。' },
    lock: { present: 'A（画面中，站，面朝右下方）、D（画面右下，坐在碎杯旁）、B（背景左，手悬在半空）、F（A 右后方）', gaze: 'A 俯视 D', props: '@道具1 在 B 左手；碎杯散落；红毯与大理石有酒渍', env: '同上一段', mood: 'A 说完台词，D 狼狈，全场安静', lastShot: 'A 的低角度中近景' },
  },
  {
    n: 6, seconds: 15, plotSeconds: 11, title: '“Mercer 女士，您的车到了”', event: 'Ava 离场，Lucas 鼓掌，Ethan 意识到她的身份', ending: '停在 Ethan 僵住的脸，车灯扫入', cast: ['A', 'B', 'G'], scene: '@场景1', props: ['@道具1'],
    opening: '转场缓冲', edit: '多镜头，3 个切点；首镜为道具与环境特写，吸收上一段多人站位',
    narrative: '转场缓冲（上一段多人混乱收尾）：先给酒液沿红毯边缘流过、A 的婚纱拖尾从酒渍上滑过的特写 → A 沿红毯走向大门 → 大门口 G 慢慢鼓掌并说台词 → B 的内心独白 → 停在 B 的脸上，门外车灯扫进宴会厅。',
    beats: [
      { t: '0—3', task: '缓冲：拖尾滑过酒渍', act: 'A 的婚纱拖尾从红毯上的酒渍与一只倒着的香槟杯旁滑过，杯子被拖尾带得轻轻滚动。', cam: '镜头 C 贴地约 0.2 米，固定，拖尾从画面右侧滑到左侧出画。', bg: '远处虚化的宾客双腿，有人后退半步让路。' },
      { t: '3—8', task: '她走向大门', act: 'A 提起裙摆，沿红毯走向正门，步伐稳定，不回头；两侧宾客自动让开视线。', cam: '镜头 C 位于红毯中轴、A 身后约 3 米，背影跟拍，正门在纵深尽头逐渐变大。', bg: '宾客看着 A 经过；B 在画面左侧远处，原地未动。' },
      { t: '8—12', task: '鼓掌的人', act: '大门口站着 G，慢慢鼓掌三下，然后侧身拉开一扇门，对 A 说台词并微微低头。A 经过 G 时脚步不停。', cam: '切正面：镜头 C 在门外向内拍，G 在画面右侧中景，A 从纵深走向镜头。', bg: '门外走廊灯光明亮，远处门廊有车灯。' },
      { t: '12—15', task: '他意识到了', act: 'B 站在红毯前段，左手攥着 @道具1，嘴唇微张；内心独白响起时他慢慢抬头看向大门方向。', cam: '镜头 C 缓慢推近 B 的正面近景，最后停在他僵住的脸上；门外车灯的白光从画面右侧扫过他的脸。', bg: '背景 D 被人扶起，虚化。' },
    ],
    dialogue: [
      { who: 'G', at: '9—11', line: 'Ms. Mercer, your car is here.', zh: 'Mercer 女士，您的车到了。' },
      { who: 'B（OS）', at: '12—14', line: 'Mercer... as in THE Mercers?', zh: 'Mercer……那个 Mercer 家族？' },
    ],
    perf: { blink: 'B 在独白结束时停止眨眼；A 不回头。', gaze: 'G 看 A；B 看大门。', turn: 'A 不回头。', stop: 'A 不在门口停留。', expr: 'G 克制的微笑；B 惊惧。', dual: '无。', prop: '@道具1 在 B 左手。' },
    lock: { present: 'B（红毯前段，面朝大门）；A、G 已离开画面', gaze: 'B 看大门', props: '@道具1 在 B 左手', env: '傍晚转夜，门外车灯', mood: 'B 意识到 Ava 的身份，集尾悬念', lastShot: 'B 正面近景' },
  },
];

export const ACTION_CARD_EP1_S5 = {
  segment: 5,
  items: [
    { k: '题材质感', v: '写实冲突（不是武打片）：无特效，只有物理冲击', options: ['写实冲突', '动作电影', '奇幻能量'], pick: 0 },
    { k: '卖点', v: '速度型：一扬手、一扣腕、一推，快准短', options: ['速度型', '力量型', '体量型'], pick: 0 },
    { k: '双方打法', v: 'D：右手扬掌扇耳光，重心前冲，被推后高跟鞋崴脚。A：左手扣腕 → 外旋下压 → 顺势推开，下盘不动' },
    { k: '物理冲击', v: '香槟塔从上到下成排倒落、酒液泼洒、杯子在大理石上滚动；不出现玻璃划伤' },
    { k: '节奏曲线', v: '0–3 秒冲上来 → 3–6 秒扣腕定住（全场静）→ 6–10 秒推开撞塔 → 10–15 秒塔倒与台词' },
    { k: '高潮画面', v: '香槟塔在 D 身后整排倒下，A 在前景纹丝不动' },
    { k: '结尾', v: '终结一击：D 坐倒在碎杯旁；下一段用“拖尾滑过酒渍”的转场缓冲衔接', options: ['终结一击', '钩子（停在将命中前）'], pick: 0 },
    { k: '参考图分工', v: '@角色1、@角色3 只取人物不取背景；场景唯一出处 @场景1' },
    { k: '台词与禁区', v: 'A 一句：Careful. That dress was charged to my company. 无血腥；耳光不能打中脸', options: ['无血腥', '允许轻微擦伤'], pick: 0 },
  ],
  beats: '15 秒 → 4 拍，每拍 3–4 秒',
};

export const PLACES = {
  '@场景1': {
    time: '傍晚，晴；室内吊灯已亮，窗外金色斜阳。',
    place: 'Halcyon 宴会厅婚礼仪式区——红毯中轴从正门双开大门通往尽头的白玫瑰拱门与两级大理石台阶；两侧宾客席；右侧靠墙七层香槟塔；左侧拱形落地窗；右侧有一扇侧门。',
    light: '主光源：三盏水晶吊灯的暖金顶光 + 左侧落地窗的低角度金色斜阳（主光方向固定在画面左侧）。环境反射：大理石与白玫瑰把暖光反到人物下颌。面部与身体：近景用柔和侧光，眼睛有吊灯眼神光。空间层次：前景暖亮、中景宾客略暗、背景大门逆光。随动变化：人物穿过窗影时明暗交替。',
    spaceRule: '红毯中轴、拱门、大门、香槟塔的方位全段不变；',
  },
};
