#Requires -Version 5.1
<#
.SYNOPSIS
    Bootstrap a new repository with the heymishy/skills-repo SDLC pipeline.

.DESCRIPTION
    Creates a new GitHub repo (optional), clones the skills pipeline, installs it
    into your target directory, and cleans up. A thin wrapper around install.ps1.

.PARAMETER Target
    Path to the root of your new (already cloned) repository. Default: current directory.

.PARAMETER Profile
    Context profile: personal | work. Default: personal.

.PARAMETER UpstreamStrategy
    none   - One-time install, no sync remote added (default).
    remote - Add heymishy/skills-repo as 'skills-upstream' git remote.
    fork   - Add a private org fork as 'skills-upstream'. Requires -UpstreamUrl.

.PARAMETER UpstreamUrl
    Required when -UpstreamStrategy fork.
    Example: https://bitbucket.org/your-org/sdlc-skills.git

.PARAMETER Overwrite
    Overwrite existing files (useful when re-running to update).

.EXAMPLE
    # Simplest — run from inside your already-cloned repo:
    irm https://raw.githubusercontent.com/heymishy/skills-repo/master/scripts/bootstrap-new-repo.ps1 | iex

.EXAMPLE
    # Personal project with upstream remote:
    & .\bootstrap-new-repo.ps1 -Target C:\code\my-project -Profile personal -UpstreamStrategy remote

.EXAMPLE
    # Enterprise with org fork:
    & .\bootstrap-new-repo.ps1 -Target C:\code\my-project -Profile work `
        -UpstreamStrategy fork -UpstreamUrl "https://bitbucket.org/your-org/sdlc-skills.git"
#>
[CmdletBinding()]
param(
    [string] $Target           = (Get-Location).Path,
    [ValidateSet('personal','work')]
    [string] $Profile          = 'personal',
    [ValidateSet('none','remote','fork')]
    [string] $UpstreamStrategy = 'none',
    [string] $UpstreamUrl      = '',
    [switch] $Overwrite
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function info($m)    { Write-Host "[bootstrap] $m" -ForegroundColor Cyan }
function success($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function warn($m)    { Write-Host "[!] $m" -ForegroundColor Yellow }

#  Clone skills repo to temp 
$TempDir = Join-Path $env:TEMP "skills-repo-$(Get-Random)"
info "Cloning heymishy/skills-repo to $TempDir ..."
git clone --depth 1 --quiet https://github.com/heymishy/skills-repo.git $TempDir
if ($LASTEXITCODE -ne 0) { Write-Error "git clone failed."; exit 1 }
success "Cloned."

#  Run installer 
$installArgs = @{
    Target           = $Target
    Profile          = $Profile
    UpstreamStrategy = $UpstreamStrategy
}
if ($UpstreamUrl)   { $installArgs.UpstreamUrl = $UpstreamUrl }
if ($Overwrite)     { $installArgs.Overwrite   = $true }

info "Running installer (profile: $Profile, upstream: $UpstreamStrategy) ..."
& "$TempDir\scripts\install.ps1" @installArgs
$exitCode = $LASTEXITCODE

#  Clean up 
Remove-Item -Recurse -Force $TempDir
success "Cleaned up temp clone."

exit $exitCode
