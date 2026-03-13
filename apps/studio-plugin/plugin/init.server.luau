--!strict
-- Image2Roblox Builder Studio Plugin (Phase 5 scaffold)

local toolbar = plugin:CreateToolbar("Image2Roblox")
local openButton = toolbar:CreateButton(
  "OpenBuilderDock",
  "Open the Image2Roblox Builder dock widget",
  "rbxassetid://4458901886"
)

local widgetInfo = DockWidgetPluginGuiInfo.new(
  Enum.InitialDockState.Float,
  true,
  true,
  460,
  340,
  320,
  260
)

local widget = plugin:CreateDockWidgetPluginGui("Image2RobloxBuilderDock", widgetInfo)
widget.Title = "Image2Roblox Builder"

local frame = Instance.new("Frame")
frame.Name = "Root"
frame.BackgroundColor3 = Color3.fromRGB(24, 30, 44)
frame.BorderSizePixel = 0
frame.Size = UDim2.fromScale(1, 1)
frame.Parent = widget

local title = Instance.new("TextLabel")
title.Name = "Title"
title.BackgroundTransparency = 1
title.Font = Enum.Font.GothamBold
title.Text = "Image2Roblox Builder"
title.TextColor3 = Color3.fromRGB(230, 240, 255)
title.TextSize = 19
title.TextXAlignment = Enum.TextXAlignment.Left
title.Position = UDim2.fromOffset(14, 12)
title.Size = UDim2.new(1, -28, 0, 26)
title.Parent = frame

local metadata = Instance.new("TextLabel")
metadata.Name = "Metadata"
metadata.BackgroundTransparency = 1
metadata.Font = Enum.Font.Code
metadata.TextWrapped = true
metadata.TextXAlignment = Enum.TextXAlignment.Left
metadata.TextYAlignment = Enum.TextYAlignment.Top
metadata.TextColor3 = Color3.fromRGB(200, 212, 232)
metadata.TextSize = 13
metadata.Position = UDim2.fromOffset(14, 44)
metadata.Size = UDim2.new(1, -28, 0, 140)
metadata.Parent = frame

local actions = Instance.new("TextLabel")
actions.Name = "Actions"
actions.BackgroundTransparency = 1
actions.Font = Enum.Font.Code
actions.TextWrapped = true
actions.TextXAlignment = Enum.TextXAlignment.Left
actions.TextYAlignment = Enum.TextYAlignment.Top
actions.TextColor3 = Color3.fromRGB(170, 191, 220)
actions.TextSize = 12
actions.Position = UDim2.fromOffset(14, 196)
actions.Size = UDim2.new(1, -28, 0, 120)
actions.Parent = frame

local function refreshMetadata()
  metadata.Text = table.concat({
    "Name: Image2Roblox Builder Plugin",
    "Version: 0.2.0",
    "Mode: Optional Studio Companion",
    "Status: Desktop-first pipeline is primary",
    "",
    "This plugin currently provides metadata viewing and command stubs.",
    "Use the desktop app to generate or regenerate project systems."
  }, "\n")

  actions.Text = table.concat({
    "Commands:",
    "1) Refresh metadata (implemented)",
    "2) Reimport generated content (stub)",
    "3) Rebuild selected systems (stub)",
    "",
    "Next: wire commands to filesystem sync + targeted regeneration calls."
  }, "\n")
end

openButton.Click:Connect(function()
  widget.Enabled = not widget.Enabled
  if widget.Enabled then
    refreshMetadata()
  end
end)

widget:GetPropertyChangedSignal("Enabled"):Connect(function()
  if widget.Enabled then
    refreshMetadata()
  end
end)

refreshMetadata()
widget.Enabled = true
