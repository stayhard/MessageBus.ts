MessageBus.ts
=============

Client side message bus for TypeScript projects.

## Changelog ##
**0.1.0**

- Reply channels are no longer nested. Only one reply channel is ever created for each subscriber on the root channel.
- It's now possible to use Regex patterns for subscribing to messages. Example:

```
channel.on("Exception$", () => {
  /* Will receive all messages ending with "Exception" */
});
```

- Logging parts have been removed as they was no longer used.
    
