//mikoto - 修改点歌卡片的封面
//使用方法：圈x 添加主机名  api.dragonlongzhu.cn
//修改本配置的文件名为mkqqyy.js
//把这个配置放到文件app-quantumultx-Scripts
//修改本配置显示文本和封面链接
//然后点歌


let body = $response.body;
if (body) {
  try {
    let obj = JSON.parse(body);
    if (obj && obj.data) {
   
      let originalName = obj.data.song_name || "";
      let originalSinger = obj.data.song_singer || "";
    
      obj.data.song_name = originalName + "-" + originalSinger;
      // 将歌手改为固定文本“点击播放—>”
      // obj.data.song_singer = "恭喜发财"+ ","+ "大吉大利";
      obj.data.song_singer = "阿根的专属电台";
      // 修改封面，这个链接中，你只需要改一下后面的uin=你的qq号码，其它不要动。保存即可。会调用你的qq号头像。
      // obj.data.cover = "http://q4.qlogo.cn/headimg_dl?dst_uin=826371884&spec=640"
      obj.data.cover = "http://q4.qlogo.cn/headimg_dl?dst_uin=826371884&spec=640";
    }
    $done({body: JSON.stringify(obj)});
  } catch (e) {
    console.log("解析失败:", e);
    $done({body});
  }
} else {
  $done({});
}
