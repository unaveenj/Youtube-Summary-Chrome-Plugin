# 📺 YouTube AI Video Summarizer Chrome Extension

> Generate AI-powered summaries directly on YouTube with beautiful glassmorphism UI!

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-brightgreen)](https://chrome.google.com/webstore)
[![GitHub license](https://img.shields.io/github/license/unaveenj/Youtube-Summary-Chrome-Plugin)](https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/unaveenj/Youtube-Summary-Chrome-Plugin)](https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin/stargazers)

An intelligent Chrome extension that extracts YouTube video transcripts and generates AI-powered summaries using OpenRouter's GPT-OSS-20B model, displayed in a beautiful glassmorphism UI directly below the video.

## ✨ Features

- 🎯 **One-Click AI Summarization**: Simple button next to YouTube's like/share buttons
- 🤖 **Local AI Processing**: Generate summaries using OpenRouter's free GPT-OSS-20B model
- ✨ **Glassmorphism UI**: Beautiful, modern interface with blur effects and animations
- 🔄 **Auto-Transcript Extraction**: Directly extracts transcripts using Supadata API
- 📱 **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile
- 🎨 **YouTube Theme Integration**: Matches YouTube's light/dark themes perfectly
- 📋 **Copy & Share**: Easy copy to clipboard and sharing functionality
- 🔒 **Privacy First**: All processing happens locally, no data collection

## 🚀 Quick Start

### Installation
1. **Download**: Clone or download this repository
   ```bash
   git clone https://github.com/unaveenj/Youtube-Summary-Chrome-Plugin.git
   ```
2. **Open Chrome Extensions**: Navigate to `chrome://extensions/`
3. **Enable Developer Mode**: Toggle the switch in the top right
4. **Load Extension**: Click "Load unpacked" and select the extension folder
5. **Ready!**: The extension is now active on YouTube

## 🎯 How to Use

### Simple 3-Step Setup
1. **Get API Keys**: 
   - [Supadata API](https://supadata.ai) - for transcript extraction
   - [OpenRouter API](https://openrouter.ai) - for AI summarization (free tier available)
2. **Configure Extension**: Click the extension icon and enter your API keys
3. **You're Ready**: Go to any YouTube video and click "Summarize"!

### Generate Summaries
1. **Watch Video**: Navigate to any YouTube video with captions/subtitles
2. **Click Summarize**: Hit the "Summarize" button next to Like/Share buttons
3. **View Summary**: AI-generated summary appears in a beautiful glassmorphism container below the video
4. **Interact**: Copy, share, or collapse/expand the summary as needed

## 📁 File Structure

```
youtube-ai-summarizer/
├── manifest.json          # Extension configuration
├── content.js            # YouTube integration and AI summarization logic
├── popup.html            # Extension settings popup
├── popup.js              # Settings management and API testing
├── styles.css           # Glassmorphism UI styling
├── icons/               # Extension icons
└── README.md            # This file
```

## 🔧 How It Works

1. **Video Detection**: Extension detects YouTube video pages and injects summarize button
2. **Transcript Extraction**: Uses Supadata API to extract video transcripts
3. **AI Summarization**: Sends transcript to OpenRouter's GPT-OSS-20B model for analysis
4. **UI Display**: Shows beautiful glassmorphism summary container below the video
5. **User Interaction**: Provides copy, share, and collapse/expand functionality

## 📋 AI Summary Format

The extension generates comprehensive summaries with the following structure:

```
## Main Topic/Theme
Brief overview of what the video is primarily about

## Key Points
• Important point 1 discussed in the video
• Important point 2 with relevant context
• Important point 3 and its implications
• Additional key insights

## Important Insights
Key takeaways and conclusions drawn from the content

## Actionable Information
Practical advice, recommendations, or steps mentioned in the video
```

The summary is displayed in a beautiful glassmorphism container with options to copy, share, or collapse/expand the content.

## 🔧 Requirements

- Chrome browser with Manifest V3 support
- [Supadata API key](https://supadata.ai) (for transcript extraction)
- [OpenRouter API key](https://openrouter.ai) (free tier available for GPT-OSS-20B)
- YouTube videos with available captions/transcripts
- Active internet connection for API access

## 🔒 Privacy & Security

- ✅ **Secure API Integration**: Uses encrypted HTTPS connections to trusted services
- ✅ **No data collection**: Zero personal information stored or transmitted
- ✅ **Local storage only**: API keys stored securely in Chrome's local storage
- ✅ **Open source**: Fully transparent codebase for security review
- ✅ **Minimal permissions**: Only YouTube, Supadata, and OpenRouter access required
- ✅ **No tracking**: No analytics, cookies, or user behavior tracking

## 🐛 Troubleshooting

### Common Issues
- **"API key not configured"**: Configure your Supadata and OpenRouter API keys in extension settings
- **"No transcript available"**: Video doesn't have captions/subtitles available
- **Button not appearing**: Refresh the YouTube page or reload the extension
- **Summary not generating**: Check your OpenRouter API key and internet connection
- **Timeout errors**: Try again - the APIs might be temporarily overloaded

### API Key Setup
1. **Supadata API**: Visit [supadata.ai](https://supadata.ai) to get your API key
2. **OpenRouter API**: Visit [openrouter.ai](https://openrouter.ai) to get your free API key
3. **Extension Settings**: Click the extension icon and enter both API keys
4. **Test Connection**: Use the "Test Connection" button to verify everything works

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

✨ **Featuring beautiful glassmorphism UI and free AI-powered summarization**