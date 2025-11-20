// YellowDuck 前端模拟 - app.js
(function () {
  const authInput = document.getElementById('authInput');
  const generateBtn = document.getElementById('generateBtn');
  const requestPreview = document.getElementById('requestPreview');
  const responsePreview = document.getElementById('responsePreview');
  const qrContainer = document.getElementById('qrcode');
  const qrContent = document.getElementById('qrContent');
  const directMode = document.getElementById('directMode');

  // 初始化输入示例
  authInput.value = 'Token /SDIL4zxJE2S@uZLqIuikNf6';

  function formatRequest(auth) {
    return [
      'GET https://pw.gzych.vip/ykb_huiyuan/api/v1/Member/GetLeaguerDynamicQRCode HTTP/1.1',
      'Host: pw.gzych.vip',
      'Connection: keep-alive',
      'xweb_xhr: 1',
      `Authorization: ${auth || ''}`,
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14315',
      'Content-Type: application/json',
      'Accept: */*',
      'Sec-Fetch-Site: cross-site',
      'Sec-Fetch-Mode: cors',
      'Sec-Fetch-Dest: empty',
      'Referer: https://servicewechat.com/wx1ca00ea58905039c/1/page-frame.html',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: zh-CN,zh;q=0.9'
    ].join('\n');
  }

  function simulateResponse(auth) {
    // 简单模拟：根据 Authorization 是否符合“Token ”前缀，生成一个固定/变化的二维码字符串
    const ok = typeof auth === 'string' && auth.trim().toLowerCase().startsWith('token ');
    const base = 'LH_U4HIHUK356TENGRUWLTQCROY7E7EDPIDAGLC5YX';

    // 如果 token 不合法，返回错误码
    if (!ok) {
      return {
        ResponseStatus: { ErrorCode: '401', Message: 'Authorization 格式错误，应以 "Token " 开头', IsCache: false },
        Data: { QRCode: '', Description: '请检查 Authorization 输入', RefreshTime: 0 }
      };
    }

    // 合法时，生成一个可复现的伪随机二维码内容（根据输入字符串计算哈希简化版）
    const hash = simpleHash(auth);
    const qr = base.slice(0, 8) + '-' + hash.slice(0, 24);

    return {
      ResponseStatus: { ErrorCode: '0', Message: null, IsCache: false },
      Data: {
        QRCode: qr,
        Description: '可在收银台/自助设备/闸机/游戏设备扫码提币/存币/存票/进出闸/游玩',
        RefreshTime: 0
      }
    };
  }

  function simpleHash(str) {
    let h = 2166136261; // FNV-1a 32 位起始值（简化）
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h >>> 0) * 16777619;
    }
    // 输出为 base36，便于压缩显示
    return Math.abs(h >>> 0).toString(36) + '-' + Math.abs((h * 48271) >>> 0).toString(36);
  }

  function renderQRCode(text) {
    // 清空之前的二维码
    qrContainer.innerHTML = '';
    if (!text) {
      qrContent.textContent = '无二维码内容';
      return;
    }
    if (window.QRCode) {
      const qrcode = new QRCode(qrContainer, {
        text,
        width: 260,
        height: 260,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      // 本地/网络环境无法加载 qrcodejs 时使用外部服务生成二维码图片
      const img = document.createElement('img');
      img.alt = 'QR Code';
      img.width = 260;
      img.height = 260;
      img.style.width = '260px';
      img.style.height = '260px';
      img.src = 'https://chart.googleapis.com/chart?cht=qr&chs=260x260&chl=' + encodeURIComponent(text) + '&chld=H|0';
      qrContainer.appendChild(img);
    }
    qrContent.textContent = text;
  }

  function run() {
    const auth = authInput.value.trim();

    // 预览请求
    requestPreview.textContent = formatRequest(auth);

    const useDirect = !!(directMode && directMode.checked);
    const url = useDirect
      ? 'https://pw.gzych.vip/ykb_huiyuan/api/v1/Member/GetLeaguerDynamicQRCode'
      : '/ykb_huiyuan/api/v1/Member/GetLeaguerDynamicQRCode';

    // 实际请求（直连或代理）
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': auth,
        'Accept': '*/*'
      }
    }).then(async (resp) => {
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

      // 预览响应
      responsePreview.textContent = JSON.stringify(data, null, 2);

      // 生成二维码
      const qr = data?.Data?.QRCode || '';
      renderQRCode(qr);
    }).catch((err) => {
      responsePreview.textContent = JSON.stringify({ error: String(err) }, null, 2);
      renderQRCode('');
    });
  }

  generateBtn.addEventListener('click', run);

  // 回车提交
  authInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') run();
  });

  // 首次渲染
  run();
})();