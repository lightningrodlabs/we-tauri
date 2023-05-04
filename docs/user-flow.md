# User Flow

```mermaid

graph TD

EnterPasswordView-->|enter_password|Welcome
Welcome-->|select_group|GroupHome
Welcome-->|select_applet|CrossAppletMain
GroupHome-->|select_applet|AppletMain
GroupHome-->InviteMembers
GroupHome-->InstallableApplets
GroupSettings-->|select_applet_settings|AppletSettings
AppletSettings-->FederateView
AppletSettings-->UninstallApplet
GroupHome-->|select_settings|GroupSettings
GroupSettings-->LeaveGroup
```