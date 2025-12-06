# Security & Privacy

HER is designed to be Local-First.

## Data Storage
- All data is stored in `her-native.sqlite` on your local disk.
- No data is sent to the cloud by default.
- "Remote LLM" features are opt-in and disabled by default.

## Encryption
To encrypt your database, we recommend using OS-level encryption (BitLocker) for the data folder.
Application-level encryption usage of `sqlcipher` is planned for V2.

## Permissions
- The Agent requires permissions to read window titles.
- The Installer registers a User Data task.
