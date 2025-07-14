# 📺 YouTube Video Summarizer Chrome Extension

> Transform any YouTube video into concise summaries with ChatGPT integration!

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-brightgreen)](https://chrome.google.com/webstore)
[![GitHub license](https://img.shields.io/github/license/unaveenj/Youtube-Summary-Chrome-Plugin)](https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/unaveenj/Youtube-Summary-Chrome-Plugin)](https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin/stargazers)

A powerful Chrome extension that automatically extracts transcripts from YouTube videos and creates intelligent summaries using ChatGPT.

## ✨ Features

- 🎯 **One-Click Summarization**: Simple button next to YouTube's like/share buttons
- 🤖 **ChatGPT Integration**: Automatically opens ChatGPT with formatted summary prompts
- 🔗 **Free API Support**: Uses Supadata.ai API for reliable transcript extraction (100 free requests)
- 🔐 **Secure Storage**: Encrypted local storage for API keys and settings
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🎨 **YouTube Theme Integration**: Matches YouTube's light/dark themes
- 📊 **Usage Tracking**: Local statistics to track your summarization history
- 🛠️ **Fallback Options**: Manual transcript input for videos without captions

## 🚀 Quick Start

### Option 1: Chrome Web Store (Recommended)
- Install from [Chrome Web Store](https://chrome.google.com/webstore) (Coming Soon)

### Option 2: Manual Installation
1. **Download**: Clone or download this repository
   ```bash
   git clone https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin.git
   ```
2. **Open Chrome Extensions**: Navigate to `chrome://extensions/`
3. **Enable Developer Mode**: Toggle the switch in the top right
4. **Load Extension**: Click "Load unpacked" and select the extension folder
5. **Ready!**: The extension is now active on YouTube

## 🎯 How to Use

### First Time Setup
1. **Get Free API Key**: 
   - Go to [dash.supadata.ai](https://dash.supadata.ai)
   - Sign up for free (100 requests, no credit card)
   - Copy your API key

2. **Configure Extension**:
   - Click the ⚙️ settings button next to any YouTube video
   - Paste your API key and click "Save Key"
   - Test the API to ensure it works

### Daily Usage
1. **Watch Video**: Go to any YouTube video
2. **Click Summarize**: Hit the "Summarize" button next to Like/Share
3. **Get Summary**: ChatGPT opens with an intelligent summary prompt
4. **Review**: Read the key points, conclusions, and actionable insights!

## File Structure

```
youtube-summarizer-extension/
├── manifest.json          # Extension configuration
├── content.js            # YouTube page integration
├── background.js         # ChatGPT communication
├── popup.html           # Settings interface
├── popup.js             # Settings functionality
├── styles.css           # Sidebar styling
├── icons/               # Extension icons
└── README.md            # This file
```

## How It Works

1. **Video Detection**: The extension detects when you're watching a YouTube video
2. **Transcript Extraction**: It extracts the video's transcript from YouTube's captions
3. **ChatGPT Integration**: The transcript is sent to your open ChatGPT session
4. **Summary Generation**: ChatGPT processes the transcript and generates a summary
5. **Display**: The summary is displayed in a collapsible sidebar

## Requirements

- Chrome browser with Manifest V3 support
- Active ChatGPT session (free or paid account)
- YouTube videos with available captions/transcripts

## Settings

Access settings by clicking the extension icon in the toolbar:

- **Auto-summarize**: Automatically generate summaries for new videos
- **Summary format**: Choose between bullet points, paragraph, or detailed format
- **Max length**: Control summary length (300, 500, or 800 words)

## Troubleshooting

### Common Issues

1. **"ChatGPT not found" error**: Make sure you have ChatGPT open in a Chrome tab and are logged in
2. **"No transcript available" error**: The video doesn't have captions enabled
3. **Sidebar not appearing**: Try refreshing the YouTube page or reloading the extension

### Permissions

The extension requires these permissions:
- `activeTab`: Access the current YouTube tab
- `storage`: Save summaries and preferences
- `scripting`: Inject content scripts into YouTube pages

## Privacy

- No data is sent to external servers except ChatGPT
- Summaries are stored locally in your browser
- No personal information is collected or transmitted

## Development

To modify or contribute to this extension:

1. Make your changes to the source files
2. Reload the extension in `chrome://extensions/`
3. Test on YouTube videos with captions
4. Submit pull requests with improvements

## Limitations

- Requires videos with available transcripts/captions
- Depends on ChatGPT being accessible and functional
- May not work with age-restricted or private videos
- Summary quality depends on transcript accuracy

## License

## 🏗️ Technical Details

### Built With
- **Manifest V3**: Latest Chrome extension standards
- **Vanilla JavaScript**: No frameworks, lightweight and fast
- **Supadata.ai API**: Reliable transcript extraction service
- **Chrome Storage API**: Secure local data management

### Architecture
- **content.js**: Main extension logic and UI injection
- **manifest.json**: Extension configuration and permissions
- **styles.css**: YouTube-integrated styling
- **Secure storage**: Encrypted API key management

## 🔒 Privacy & Security

- ✅ **No data collection**: Zero personal information stored
- ✅ **Local storage only**: API keys never leave your browser
- ✅ **Encrypted storage**: Base64 encoding for API keys
- ✅ **Open source**: Fully transparent codebase
- ✅ **Minimal permissions**: Only YouTube and API access

## 🐛 Troubleshooting

### Common Issues
- **"No captions available"**: Video doesn't have transcripts - use manual method
- **"API key invalid"**: Check your Supadata.ai key in settings
- **Button not appearing**: Refresh YouTube page or reload extension

### Getting Help
- Check [Issues](https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin/issues)
- Create a new issue with details
- Include Chrome version and error messages

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Support the Project

If you find this extension helpful:
- ⭐ **Star** this repository
- 🐛 **Report** bugs and suggest features
- 📢 **Share** with others who might benefit
- 💝 **Contribute** code improvements

## 📧 Contact

**Naveen U** - [@unaveenj](https://github.com/unaveenj)

Project Link: [https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin](https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin)

---

**Made with ❤️ for productivity and learning**