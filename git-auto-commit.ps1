
param(
  [string]$Message = "chore: salvar alterações automáticas"
)

try {
  $repoRoot = (Get-Location).Path
  Set-Location $repoRoot
} catch {}


if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
  Write-Error "Pasta não é um repositório git."
  exit 1
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if (-not $branch) {
  Write-Error "Não consegui detectar a branch atual."
  exit 1
}

git add -A


$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Host "Nada a commitar."
  exit 0
}

try {
  git commit -m $Message
} catch {
  Write-Error "Erro no commit: $_"
  exit 1
}


try {
  git pull --rebase origin $branch
} catch {
  Write-Warning "Pull --rebase falhou; você pode resolver conflitos manualmente. Tentarei push mesmo assim."
}


try {
  git push -u origin $branch
  Write-Host "Push realizado para origin/$branch"
} catch {
  Write-Error "Push falhou: $_"
  exit 1
}