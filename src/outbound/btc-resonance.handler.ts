async execute(trigger: any, params: any): Promise<any> {
    try {
      const [m15, h1, h4, d1, w1] = await Promise.all([
        this.getMA('BTCUSDT', '15m'),
        this.getMA('BTCUSDT', '1h'),
        this.getMA('BTCUSDT', '4h'),
        this.getMA('BTCUSDT', '1d'),
        this.getMA('BTCUSDT', '1w')
      ]);

      // 核心對齊邏輯：價格固定 10 寬度，MA 固定 10 寬度
      const fixP = (p: number) => p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).padStart(10, ' ');
      const fixM = (m: number) => m.toFixed(1).padStart(10, ' ');
      const fixS = (p: number, m: number) => p > m ? "BULL [O]" : "BEAR [X]";
      
      const resonance = [m15, h1, h4, d1].filter(x => x.price > x.ma).length;
      const now = new Date();
      const tpe = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei', hour12: false });
      const nyc = now.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false });

      // 使用 ASCII 網格確保在手機上也不易塌陷
      const content = 
`[ JASON'S BTC RESONANCE MONITOR ]
-----------------------------------------
TIME | PRICE      | MA20       | STATUS
-----------------------------------------
15m  |${fixP(m15.price)} |${fixM(m15.ma)} | ${fixS(m15.price, m15.ma)}
01h  |${fixP(h1.price)} |${fixM(h1.ma)} | ${fixS(h1.price, h1.ma)}
04h  |${fixP(h4.price)} |${fixM(h4.ma)} | ${fixS(h4.price, h4.ma)}
24h  |${fixP(d1.price)} |${fixM(d1.ma)} | ${fixS(d1.price, d1.ma)}
-----------------------------------------
WEEK | MA: ${w1.ma.toFixed(1)} -> ${w1.price > w1.ma ? 'BULLISH' : 'BEARISH'}
-----------------------------------------
SCORE: ${resonance}/4 | TPE: ${tpe}
-----------------------------------------`;

      return { success: true, data: { content } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
