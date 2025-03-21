const http = (op) => {
  return new Promise((resolve, reject) => {
    if (this.$httpClient) {
      this.$httpClient[op.method || "get"](op, (err, resp, data) => {
        if (err) return reject(err);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    } else if (this.$task) {
      this.$task.fetch(op).then(
        ({ body }) => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        },
        (err) => reject(err)
      );
    } else {
      reject(new Error("No HTTP client available"));
    }
  });
};

const getPriceData = async () => {
  try {
    const productIdMatch = $request.url.match(/\d+/);
    if (!productIdMatch) throw new Error("Product ID not found");
    
    const body = await http({
      method: "post",
      url: "https://apapia-history.manmanbuy.com/ChromeWidgetServices/WidgetServices.ashx",
      headers: {
        "User-Agent": "CFNetwork/3826.500.101 Darwin/24.4.0",
      },
      body: `methodName=getHistoryTrend&p_url=https://item.m.jd.com/product/${productIdMatch[0]}.html`,
    });
    
    if (!body || body.err) return { err: true, msg: "Failed to retrieve price data" };
    return {
      groupName: "历史比价",
      atts: getJdData(body),
    };
  } catch (error) {
    return { err: true, msg: error.message };
  }
};

getPriceData().then((priceData) => {
  if (!priceData || priceData.err) {
    console.log("Price data fetch failed:", priceData.msg);
    return $done({ body: $response.body, headers: $response.headers });
  }
  
  let { body, headers } = $response;
  if (!body.includes("<body>")) {
    console.log("Warning: <body> tag not found in response");
    return $done({ body, headers });
  }
  
  const tableHTML = priceHistoryTable(priceData);
  body = body.replace(/<body[^>]*>/, (match) => `${match}${tableHTML}`);
  
  console.log("Modified body content successfully");
  
  $done({ body, headers });
});
