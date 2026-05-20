const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { roomId } = event

  if (!roomId) {
    return { code: -1, message: '缺少房间ID' }
  }

  try {
    // 生成小程序码
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: `roomId=${roomId}`,
      page: 'pages/room/index',
      width: 280
    })

    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: `qrcodes/${roomId}.jpg`,
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
