$Action = New-ScheduledTaskAction -Execute "npm" -Argument "run dev" -WorkingDirectory "$PSScriptRoot"
$Trigger = New-ScheduledTaskTrigger -AtLogon
$Principal = New-ScheduledTaskPrincipal -GroupId "BUILTIN\Users" -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0

Register-ScheduledTask -TaskName "HerAgent" -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings
Write-Host "HER Agent Registered as Scheduled Task!"
