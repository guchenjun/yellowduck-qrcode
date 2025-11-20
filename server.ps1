Param(
    [int]$Port = 8080,
    [string]$Root = "d:\WorkSpace\yellowduck-qrcode"
)
try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Write-Host "Preview: http://localhost:$Port/"
    while ($true) {
        $context = $listener.GetContext()
        $path = $context.Request.Url.AbsolutePath.TrimStart('/')
        # API proxy route: forward to remote service with Authorization from client
        if ($path -eq 'ykb_huiyuan/api/v1/Member/GetLeaguerDynamicQRCode' -or $path -eq 'api/v1/Member/GetLeaguerDynamicQRCode') {
            try {
                $authHeader = $context.Request.Headers['Authorization']
                if ([string]::IsNullOrWhiteSpace($authHeader)) {
                    $context.Response.StatusCode = 400
                    $bytes = [Text.Encoding]::UTF8.GetBytes('{"error":"Missing Authorization header"}')
                    $context.Response.ContentType = 'application/json'
                    $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
                    $context.Response.Close()
                    continue
                }
                $handler = New-Object System.Net.Http.HttpClientHandler
                $client  = New-Object System.Net.Http.HttpClient($handler)
                $client.DefaultRequestHeaders.Add('Authorization', $authHeader)
                $client.DefaultRequestHeaders.Add('xweb_xhr', '1')
                $client.DefaultRequestHeaders.Add('Accept', '*/*')
                $uri = 'https://pw.gzych.vip/ykb_huiyuan/api/v1/Member/GetLeaguerDynamicQRCode'
                $resp = $client.GetAsync($uri).Result
                $bytes = $resp.Content.ReadAsByteArrayAsync().Result
                $context.Response.StatusCode = [int]$resp.StatusCode
                $context.Response.ContentType = 'application/json; charset=utf-8'
                $context.Response.ContentLength64 = $bytes.Length
                $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
                $context.Response.Close()
                continue
            } catch {
                $context.Response.StatusCode = 500
                $bytes = [Text.Encoding]::UTF8.GetBytes('{"error":"proxy_failed"}')
                $context.Response.ContentType = 'application/json'
                $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
                $context.Response.Close()
                continue
            }
        }
        if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
        $full = Join-Path $Root $path
        if (-not (Test-Path $full)) {
            $context.Response.StatusCode = 404
            $bytes = [Text.Encoding]::UTF8.GetBytes("Not Found")
            $context.Response.ContentType = "text/plain"
            $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
            $context.Response.Close()
            continue
        }
        $ext = [IO.Path]::GetExtension($full).ToLower()
        $mime = switch ($ext) {
            ".html" { "text/html" }
            ".css"  { "text/css" }
            ".js"   { "application/javascript" }
            ".json" { "application/json" }
            default { "application/octet-stream" }
        }
        $bytes = [IO.File]::ReadAllBytes($full)
        $context.Response.ContentType = $mime
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
        $context.Response.Close()
    }
} catch {
    Write-Error $_
    if ($listener) { $listener.Stop() }
}