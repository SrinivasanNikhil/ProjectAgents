# Notification Sounds

This directory contains sound files for chat notifications.

## Required Sound Files

Place the following sound files in this directory:

- `message.mp3` - Sound for regular messages
- `mention.mp3` - Sound for mentions (@username)
- `system.mp3` - Sound for system notifications

## Sound File Requirements

- Format: MP3
- Duration: 1-3 seconds
- Volume: Normalized to -16dB to -20dB
- Sample Rate: 44.1kHz
- Bit Rate: 128kbps or higher

## Recommended Sounds

- **message.mp3**: Short, pleasant chime or notification sound
- **mention.mp3**: Distinctive sound to alert user of mentions
- **system.mp3**: Gentle notification for system events

## Fallback

If sound files are not available, the notification system will gracefully degrade and only show visual notifications.

## Testing

You can test the notification sounds using the "Test Sound" button in the notification settings.
