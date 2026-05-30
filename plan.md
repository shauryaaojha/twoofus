1. Add import for `IAgoraRTCClient`, `IMicrophoneAudioTrack`, `ICameraVideoTrack`, `IAgoraRTCRemoteUser` from `agora-rtc-sdk-ng`.
2. Update types for `client`, `localAudioTrack`, `localVideoTrack` in `AgoraCallManager` class.
3. Update `any` types in event listeners and `emitRemoteStream` to use `IAgoraRTCRemoteUser`.
4. Add Pre-commit steps to make sure proper testing, verifications, reviews and reflections are done.
5. Submit PR with appropriate description.
