param(
    [string]$sourcePath = "$PSScriptRoot\..\public\sgp-logo.png"
)
Add-Type -AssemblyName System.Drawing
$publicDir = "$PSScriptRoot\..\public"
$srcAssetsDir = "$PSScriptRoot\..\src\assets"

Copy-Item -Path $sourcePath -Destination "$publicDir\sgp-logo.png" -Force
Copy-Item -Path $sourcePath -Destination "$publicDir\logo.png" -Force
Copy-Item -Path $sourcePath -Destination "$srcAssetsDir\sgp-logo.png" -Force

$srcImg = [System.Drawing.Bitmap]::FromFile($sourcePath)

# Sample background color from top-left corner
$bgColor = $srcImg.GetPixel(5, 5)

# Calculate emblem bounding box:
# Width is 451, height is 226. The emblem is on the left before the white line (white line is roughly at x=193).
$emblemCropW = 190
$emblemCropH = $srcImg.Height

# Function to create high quality square emblem bitmap
function Make-SquareEmblem([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($brush, 0, 0, $size, $size)

    # Scale emblem to fit with slight padding (e.g. 92% of size)
    $pad = [int]($size * 0.04)
    $targetH = $size - (2 * $pad)
    $targetW = [int]($emblemCropW * ($targetH / $emblemCropH))
    $destX = [int](($size - $targetW) / 2)
    $destY = $pad

    $destRect = New-Object System.Drawing.Rectangle($destX, $destY, $targetW, $targetH)
    $srcRect = New-Object System.Drawing.Rectangle(0, 0, $emblemCropW, $emblemCropH)
    $g.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $brush.Dispose()
    $g.Dispose()
    return $bmp
}

$bmp512 = Make-SquareEmblem 512
$bmp512.Save("$publicDir\logo512.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp192 = Make-SquareEmblem 192
$bmp192.Save("$publicDir\logo192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp192.Save("$publicDir\sgp-emblem.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp192.Save("$srcAssetsDir\sgp-emblem.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmpFav = Make-SquareEmblem 64
$bmpFav.Save("$publicDir\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$favIconHandle = $bmpFav.GetHicon()
$favIcon = [System.Drawing.Icon]::FromHandle($favIconHandle)
$stream = New-Object System.IO.FileStream("$publicDir\favicon.ico", [System.IO.FileMode]::Create)
$favIcon.Save($stream)
$stream.Close()

$srcImg.Dispose()
$bmp512.Dispose()
$bmp192.Dispose()
$bmpFav.Dispose()

Write-Output "Assets updated with high fidelity!"
