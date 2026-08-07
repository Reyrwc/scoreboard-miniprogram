const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { roomId } = event

  if (!roomId) {
    return { code: -1, message: '缺少房间ID' }
  }

  try {
    // 优先使用 getUnlimited（scene 方式，扫码后参数在 onLoad 的 options.scene 中）。
    // checkPath:false —— 页面未正式发布时也能生成（官方文档：getUnlimited 默认校验页面必须已发布）
    let result
    try {
      result = await cloud.openapi.wxacode.getUnlimited({
        scene: `roomId=${roomId}`,
        page: 'pages/room/index',
        width: 280,
        checkPath: false
      })
    } catch (err) {
      // getUnlimited 失败，退化为 get（path 方式，扫码后 roomId 直接在 onLoad 的 options 中）
      console.warn('getUnlimited 生成失败，改用 get:', err.message || err)
      result = await cloud.openapi.wxacode.get({
        path: `pages/room/index?roomId=${roomId}`,
        width: 280,
        checkPath: false
      })
    }

    // 上传到云存储（wxacode 返回的是 PNG 图片）
    const uploadResult = await cloud.uploadFile({
      cloudPath: `qrcodes/${roomId}.png`,
      fileContent: result.buffer
    })

    return {
      code: 0,
      imageUrl: uploadResult.fileID
    }
  } catch (err) {
    console.error('生成二维码失败:', err)
    return { code: -1, message: err.message || '生成失败' }
  }
}
