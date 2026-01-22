import { EventEmitter } from 'events';

// This is a simple event emitter that we can use to broadcast errors
// from anywhere in our application. We'll listen for these events in
// our FirebaseErrorListener component and display them to the user.
export const errorEmitter = new EventEmitter();
