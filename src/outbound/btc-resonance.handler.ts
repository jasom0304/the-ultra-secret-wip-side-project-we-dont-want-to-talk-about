async execute(trigger: any, params: any): Promise<any> {
    console.log(">>> [TRIGGERED] 執行排版優化抓取...");
    try {
      const [m15, h1, h4, d1, w1] = await Promise.all([
        this.getMA('BTCUSDT', '15m'),
        this.getMA('BTCUSDT', '1h'),
        this.getMA('BTCUSDT', '4h'),
        this.getMA('BTCUSDT', '1d'),
        this.getMA('BTCUSDT', '1w')
      ]);

      // 格式化函數：讓價格固定長度，不足補空格
      const fmtPrice = (p: number) => p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).padStart(10, ' ');
      const fmtMA = (m: number) => m.toFixed(1).padStart(9, ' ');
      const getStatus = (p: number, m: number) => p > m ? "Bullish 🟢" : "Bearish 🟡";
      
      const checkScore = (p: number, m: number) => p > m ? 1 : 0;
      const resonance = checkScore(m15.price, m15.ma) + checkScore(h1.price, h1.ma) + 
                        checkScore(h4.price, h4.ma) + checkScore(d1.price, d1.ma);

      const now = new Date();
      const tpe = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei', hour12: false });
      const nyc = now.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false });

      const content = `----------------------------------------------\n` +
                      `🤖  JASON'S BTC RESONANCE\n` +
                      `----------------------------------------------\n` +
                      `15m | $${fmtPrice(m15.price)} | MA:${fmtMA(m15.ma)} | ${getStatus(m15.price, m15.ma)}\n` +
                      `1h  | $${fmtPrice(h1.price)} | MA:${fmtMA(h1.ma)} | ${getStatus(h1.price, h1.ma)}\n` +
                      `4h  | $${fmtPrice(h4.price)} | MA:${fmtMA(h4.ma)} | ${getStatus(h4.price, h4.ma)}\n` +
                      `1d  | $${fmtPrice(d1.price)} | MA:${fmtMA(d1.ma)} | ${getStatus(d1.price, d1.ma)}\n\n` +
                      `🏛️  Weekly MA: ${w1.ma.toFixed(1)} -> ${w1.price > w1.ma ? 'BULLISH' : 'BEARISH'}\n` +
                      `----------------------------------------------\n` +
                      `🔥  Resonance Score: ${resonance} / 4\n` +
                      `⏰  [TPE: ${tpe} | NYC: ${nyc}]\n` +
                      `----------------------------------------------`;

      console.log(">>> [SUCCESS] 對齊版內容已生成");
      return { success: true, data: { content } };
    } catch (error: any) {
      console.error(">>> [ERROR]", error.message);
      return { success: false, error: error.message };
    }
  }
