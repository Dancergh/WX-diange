/*
 * 脚本名称：京东比价
 * 使用说明：进入APP商品详情页面触发。
 * 支持版本：App V15.0.80（自行测试）
 * 脚本作者：小白脸
 * 修复要点：
 * 1. 修复<body>标签插入方式
 * 2. 增强错误处理
 * 3. 修正商品ID获取逻辑
 * 4. 修复POST请求参数错误
 */

[Script]
京东比价 = type=http-response,pattern=^https:\/\/in\.m\.jd\.com\/product\/graphext\/\d+\.html,requires-body=1,max-size=0,binary-body-mode=0,script-path=https://raw.githubusercontent.com/githubdulong/Script/master/jd_price.js,timeout=60
 
[MITM]
hostname = %APPEND% in.m.jd.com

*/

const http = (op) => {
  const { promise, resolve, reject } = Promise.withResolvers();

  this.$httpClient?.[op.method || "get"](op, (err, resp, data) =>
    err ? reject(err) : resolve(JSON.parse(data))
  );

  this.$task?.fetch(op).then(({ body }) => resolve(JSON.parse(body)), reject);

  return promise;
};

const toDate = (t) => {
  const d = new Date(t - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().split("T")[0];
};

const parseNumber = (input) => {
  const cleaned = `${input}`.replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned);
};

const formatNumber = (num) => (Number.isInteger(num) ? num : num.toFixed(2));

const comparePrices = (a, b) => {
  const diff = formatNumber(parseNumber(a) - parseNumber(b));

  if (diff > 0) return `↑${diff}`;
  if (diff < 0) return `↓${-diff}`;
  return "●";
};

const priceHistoryTable = (data) => {
  // ...保持原有样式和结构不变...
};

const getJdData = (body) => {
  // 增加数据校验
  if (!body?.single?.jiagequshiyh) {
    return [];
  }

  try {
    const jiagequshiyh = JSON.parse(`[${body.single.jiagequshiyh}]`);
    const jiageData = jiagequshiyh.reverse().slice(0, 360);
    
    // ...后续处理逻辑保持原样...
  } catch (e) {
    console.log(`数据解析失败: ${e}`);
    return [];
  }
};

const getPriceData = async () => {
  try {
    // 精确提取商品ID
    const productId = $request.url.match(/\/graphext\/(\d+)\.html/)?.[1];
    if (!productId) {
      return { err: true, msg: "无效商品ID" };
    }

    const response = await http({
      method: "post",
      url: "https://apapia-history.manmanbuy.com/ChromeWidgetServices/WidgetServices.ashx",
      headers: {
        "user-agent": "CFNetwork/3826.500.101 Darwin/24.4.0",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: `methodName=getHistoryTrend&p_url=${encodeURIComponent(`https://item.m.jd.com/product/${productId}.html`)}`
    });

    return response?.err 
      ? response 
      : { groupName: "历史比价", atts: getJdData(response) };

  } catch (e) {
    console.log(`请求失败: ${e}`);
    return { err: true, msg: "服务暂时不可用" };
  }
};

// 主执行流程增加容错机制
(async () => {
  try {
    const priceData = await getPriceData();
    const tableHTML = priceHistoryTable(priceData);
    
    let { body, headers } = $response;
    // 使用正则确保正确插入
    body = body.replace(/<body[^>]*>/i, `$&${tableHTML}`);
    
    $done({ body, headers });
  } catch (e) {
    console.log(`脚本执行失败: ${e}`);
    $done({});
  }
})();
