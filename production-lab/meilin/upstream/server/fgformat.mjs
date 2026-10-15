// Renders a structured segment into the FG standard director prompt (fg-drama-video-prompt §2) + continuity lock (§3).

const NEG_FIXED = {
  identity: '人物面部、发型、服装、配饰在全段保持参考图身份，不换脸、不变发色、不换衣服；不出现参考图以外的主要角色。',
  motion: '不慢动作、不定格、不倒放；动作不瞬移、不穿模，肢体数量正确，手指五根。',
  space: '人物左右关系与衔接锁一致。',
  camera: '不鱼眼、不突然变焦、不无动机甩镜；不出现摄影器材和工作人员。',
  image: '不出现字幕、文字、水印、Logo、可读的屏幕文字；不过曝、不塑料皮肤、不油光。',
  sound: '不生成背景音乐和配乐（BGM 后期添加）；不生成字幕；台词不加混响失真；不出现台词与旁白以外的人声。',
  other: '画面不出现字幕、文字、水印、Logo。',
};

export function lockText(n, lock) {
  return [
    `〔衔接锁·第${n}段结束〕`,
    `在场：${lock.present}`,
    `视线：${lock.gaze}`,
    `道具：${lock.props}`,
    `环境：${lock.env}`,
    `情绪落点：${lock.mood}`,
    `末镜类型：${lock.lastShot}`,
  ].join('\n');
}

export function renderSegment(seg, ctx) {
  const { bible, style, title, episode, defaults } = ctx;
  const castByKey = Object.fromEntries((bible.cast || []).map((c) => [c.key, c]));
  // ctx.refs: the reference images actually attached to this segment (reviewed by the member), in upload order.
  const refs = ctx.refs || null;
  const has = (code) => !refs || refs.some((r) => r.code === code);
  const castLines = seg.cast.map((k) => {
    const c = castByKey[k];
    if (!c) return `人物${k}：未绑定资产（请先在资产阶段确认）。`;
    if (!has(c.code)) return `人物${k}（${c.name}）：本段不挂参考图，按文字描述保持${c.look}。`;
    return `人物${k}（${c.name}）严格参考：${c.code}。锁定面部身份、${c.look}、体型与标志性配饰。`;
  });
  const castCodes = seg.cast.map((k) => castByKey[k]?.code).filter(Boolean);
  const extra = (refs || []).filter((r) => !castCodes.includes(r.code) && r.code !== seg.scene && !(seg.props || []).includes(r.code))
    .map((r) => `${r.code}（${r.name}）：${{ character: '人物身份与服装', scene: '空间结构与光线', prop: '造型与材质' }[r.kind] || '视觉'}参考`);
  const propLine = [seg.scene ? (has(seg.scene) ? `${seg.scene}：唯一空间出处，继承宴会厅结构、红毯中轴、拱门与大门方位、香槟塔位置和灯光` : `场景：本段不挂参考图，按文字描述延续上一段空间`) : null,
    ...(seg.props || []).filter(has).map((p) => `${p}：只继承造型与材质`), ...extra].filter(Boolean).join('；');
  const dlg = seg.dialogue.map((d) => `${d.who}（${d.at} 秒）："${d.line}"（${d.zh}）`);
  const palette = style.palette.join(' / ');
  const place = (ctx.places && ctx.places[seg.scene]) || { time: '按剧本', place: '按剧本与场景参考图', light: '主光方向与上一段一致，人物面部有清晰眼神光。', spaceRule: '空间方位全段不变。' };
  const lines = [
    `[${title} · 第${episode}集 第${seg.n}段《${seg.title}》]`,
    `${seg.seconds}秒｜${seg.edit.startsWith('一镜到底') ? '一镜到底' : '多镜头'}｜${seg.action ? '写实动作冲突' : '都市豪门情感短剧'}，${bible.performance.split('；')[0]}`,
    '',
    '【视频整体概念】',
    `类型：海外竖屏短剧，${seg.action ? '写实冲突段落' : '文戏'}。`,
    `表演风格：${bible.performance}。`,
    `时长：${seg.seconds}秒。`,
    `画幅与帧率：${defaults.aspect} 竖屏，${defaults.fps}fps。`,
    `剪辑方法：${seg.edit}。`,
    `时间与天气：${place.time}`,
    `地点：${place.place}`,
    `整体叙事：${seg.narrative}`,
    '',
    '【参考图绑定】',
    ...castLines,
    `场景／道具／色彩参考：${propLine}；色彩只参考圣经画风「${style.name}」。`,
    '人物全程保持各自身份；快速运动、遮挡、短暂失焦后仍是同一面部、发型、服装和道具状态。',
    '继承：面孔、发型、服装、道具造型、空间结构；仅作气质参考：参考图的棚拍光线与背景不继承。',
    '',
    '【摄影参数与镜头控制】',
    `镜头：35mm 为主，近景切 50mm；景深：中浅景深，背景宾客可辨轮廓但不抢戏。`,
    `机位与运动：见时间轴，每次运动都有动机（跟随、揭示或让出空间），落点明确。`,
    '转向节奏：人物先动视线，再转头，肩膀最后跟随。',
    `稳定性：稳定器质感，${seg.action ? '武戏拍允许短暂手持冲击感' : '文戏只保留轻微呼吸感'}。`,
    '焦点控制：焦点随说话人和关键道具交接，交接有触发（开口、伸手、转头）。',
    `曝光与白平衡：按胶片 ${style.film} 质感，高光不过曝，肤色准确。`,
    '',
    '【画面整体视觉方向】',
    `${style.mood}。画面像院线电影的一帧而不是广告片：真实的空间纵深、真实的布料重量、克制的运镜；竖屏构图让人物占据画面上三分之二，头顶留白少，冲突双方尽量同框形成对峙。`,
    '',
    '【真实皮肤／主体材质】',
    '皮肤保留毛孔、细纹与自然红晕，哑光质感，无油光、无磨皮；缎面婚纱有重量与柔和高光，亮片逐颗反光，丝绒吸光，珍珠有温润光泽；大理石有细微纹理与倒影。',
    '',
    '【画面色彩与逻辑】',
    `主色／辅色／强调色：${palette}。饱和度中等，暗部不死黑；色彩与上一段保持一致，不因切镜换色。`,
    '',
    '【光影】',
    place.light,
    '',
    '【背景人物活动】',
    '宾客约六十人，衣着正式；按时间轴对事件作出先后反应（回头、低语、起身、后退），反应有延迟与差异，不整齐划一，不看镜头。',
    '',
    '【主角的眨眼与错时表演】',
    `眨眼：${seg.perf.blink}`,
    `视线：${seg.perf.gaze}`,
    `转向：${seg.perf.turn}`,
    `停步：${seg.perf.stop}`,
    `表情：${seg.perf.expr}`,
    `双人反应：${seg.perf.dual}`,
    `道具互动：${seg.perf.prop}`,
    '',
    `【${seg.seconds}秒分镜／动作时间轴】`,
  ];
  for (const b of seg.beats) {
    lines.push(`${b.t}秒｜${b.task}`, `人物动作：${b.act}`, `镜头运动：${b.cam}`, `背景：${b.bg}`);
  }
  if (seg.action) {
    lines.push('物理冲击锁定：扣腕时两人手臂受力方向一致；撞塔时香槟塔自上而下倒落，酒液向撞击反方向泼洒，杯子在大理石上滚动，无人被玻璃划伤。');
  }
  lines.push(
    '',
    '【声音设计】',
    '随视频生成：只生成音效、对白与旁白；不生成背景音乐和配乐（BGM 后期添加），不生成字幕。',
    `环境底声：宴会厅大空间混响，吊灯水晶轻响${seg.n <= 1 ? '，弦乐四重奏现场演奏至 3 秒戛然而止' : ''}。`,
    '人群声音：宾客低语随事件起伏，台词期间压低。',
    '人物近声：呼吸、布料摩擦、高跟鞋与皮鞋落在大理石上的脚步。',
    `现场细节声：${seg.action ? '手腕被扣住的闷响、香槟杯成排碎裂与滚动' : '门轴、椅子轻响、纸张翻动'}。`,
    `电子声：${seg.props?.includes('@道具3') ? '手机连续震动声' : '无'}。`,
    '空间关系：说话人近声清晰，宾客声在后方与两侧。',
    '对白：',
    ...dlg,
    '',
    '【负面约束】',
    `身份：${NEG_FIXED.identity}`,
    `动作：${NEG_FIXED.motion}`,
    `空间：${place.spaceRule || ''}${NEG_FIXED.space}`,
    `摄影：${NEG_FIXED.camera}`,
    `画面：${NEG_FIXED.image}`,
    `声音：${NEG_FIXED.sound}`,
    `其他：${NEG_FIXED.other}`,
  );
  return lines.join('\n');
}

// Continuity check between consecutive segments (prototype heuristic, mirrors SKILL §3 self-check).
export function checkContinuity(prev, seg) {
  if (!prev) return { ok: true, notes: ['第一段：从剧本开场起幅'] };
  const multiEnd = /双人|多人/.test(prev.lock.lastShot) || (prev.lock.present.match(/（/g) || []).length >= 3;
  if (seg.opening === '转场缓冲') return { ok: true, notes: ['上一段以' + prev.lock.lastShot + '收尾，本段前 2–3 秒用转场缓冲', '回到人物时按衔接锁复写站位'] };
  if (multiEnd && /双人/.test(prev.lock.lastShot)) return { ok: false, notes: ['上一段以双人镜头收尾，直接承接容易出现站位错乱，建议改为转场缓冲'] };
  return { ok: true, notes: ['直接承接：站位、道具、光线逐项沿用第' + prev.n + '段衔接锁'] };
}
