const $tool = {
  get: (key) => JSON.parse($persistentStore.read(key) || "{}"),
  set: (key, value) => $persistentStore.write(JSON.stringify(value), key),
};

const parseNumber = (input) => parseFloat(`${input}`.replace(/[^0-9.-]/g, ""));
const formatPrice = (num) => (Number.isInteger(num) ? num : num.toFixed(2));
const compareStatus = (a, b) => {
  const diff = parseNumber(a) - parseNumber(b);
  return diff > 0 ? `↑${formatPrice(diff)}` : diff < 0 ? `↓${formatPrice(-diff)}` : "●";
};

const generatePriceTable = (data) => {
  if (data.err) return `<div class="error">${data.msg}</div>`;

  return `
    <style>
      .price-box { margin:12px; padding:12px; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
      .price-title { font-size:16px; color:#333; margin-bottom:8px; }
      .price-table { width:100%; border-collapse:collapse; }
      .price-table th, .price-table td { padding:10px; border-bottom:1px solid #f0f0f0; text-align:center; }
      .price-table th { color:#666; font-weight:normal; }
      .price-up { color:#e4393c; }
      .price-down { color:#008000; }
    </style>
    <div class="price-box">
      <div class="price-title">📊 京东价格趋势</div>
      <table class="price-table">
        <tr><th>类型</th><th>日期</th><th>价格</th><th>波动</th></tr>
        ${data.atts.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.date}</td>
            <td>¥${formatPrice(parseNumber(item.price))}</td>
            <td class="${item.status.includes('↑') ? 'price-up' : item.status.includes('↓') ? 'price-down' : ''}">
              ${item.status}
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
};

const processPriceData = (body) => {
  try {
    const { jiagequshiyh } = body.single;
    if (!jiagequshiyh) return { err: true, msg: "无价格数据" };

    const prices = JSON.parse(`[${jiagequshiyh}]`).reverse().slice(0, 180);
    const currentPrice = parseNumber(prices[0][1]);
    const history = [];

    // 关键价格节点
    const checkPoints = [30, 60, 90, 180];
    checkPoints.forEach(days => {
      if (prices.length >= days) {
        const target = prices.slice(0, days).reduce((min, cur) => 
          parseNumber(cur[1]) < parseNumber(min[1]) ? cur : min
        );
        history.push({
          name: `${days}天最低`,
          date: new Date(target[0]).toISOString().split('T')[0],
          price: target[1],
          status: compareStatus(currentPrice, target[1])
        });
      }
    });

    // 大促价格
    prices.forEach(([time, price]) => {
      const dateStr = new Date(time).toISOString().split('T')[0];
      if (dateStr.endsWith('11-11') || dateStr.endsWith('06-18')) {
        history.push({
          name: dateStr.endsWith('11-11') ? '双十一价格' : '六一八价格',
          date: dateStr,
          price: price,
          status: compareStatus(currentPrice, price)
        });
      }
    });

    return { 
      groupName: "历史价格对比",
      atts: [
        {
          name: "当前价格",
          date: new Date().toISOString().split('T')[0],
          price: currentPrice,
          status: "●"
        },
        ...history.sort((a, b) => new Date(b.date) - new Date(a.date))
      ]
    };
  } catch (e) {
    return { err: true, msg: "数据解析失败" };
  }
};

if (typeof $response !== 'undefined') {
  let body = JSON.parse($response.body);
  const priceData = processPriceData(body);
  
  // 注入比价信息到接口响应
  if (!priceData.err) {
    body.htmlContent = generatePriceTable(priceData);
    $done({ body: JSON.stringify(body) });
  } else {
    $done({});
  }
}
