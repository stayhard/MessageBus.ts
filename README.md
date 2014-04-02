MessageBus.ts
=============

Client side message bus for TypeScript projects.

## Getting started ##

1. Create a statically typed message
```
interface MyMessage extends MessageBus.Message {
  someProp: string;
}
// Note that the variable name, generic argument and the given string needs to match the name of the interface above.
//                 |                   |                         |
//     +-----------+                   |           +-------------+
//     V                               V           V               
var MyMessage = MessageBus.Message<MyMessage>("MyMessage");
```

2. Create a channel:
```
var channel = new MessageBus.Channel();
```

3. Subscribe to your message:
```
channel.on(MyMessage, (m) => alert("Value of someProp: " + m.someProp));
```

4. Publish your message:
```
channel.publish(MyMessage, (m: MyMessage) => {
    m.someProp = "MyValue;
});
```

5. Profit!

## Getting Advanced ##

### Catch-all Subscriptions ###

It's possible to use RegEx for subscribing to messages. The RegEx is matched against the name of the message type. Using this, we can easily create a catch-all subscription:
```
channel.on('.', (m) => { console.log("MessageBus: Message of type " + (<any>m).messageType + " was sent."); });
```

You can also subscribe to a subset of messages using RegEx matching:
```
channel.on('Key.+', (m) => { console.log("MessageBus: This message's name started with 'Key'."); });
```

### Reply Channels ###

A message handler is invoked with two parameters. The first one is the message, as can be seen in the above examples. The second one is a ReplyChannel object, which is a channel that will only send the messages between the original publisher and the current handler.

Example of publishing on a reply channel:
```
channel.on('Key.+', (m, replyChannel) => {
    replyChannel.publish(MyReplyMessage, (m: MyReplyMessage) { m.status = "OK!" });
});
```

Listening on a reply channel can be done by subscribing to the return value of publish().

Example of listening on a reply channel:
```
// Publish a message as usual:
channel.publish(MyMessage, (m: MyMessage) => {
    m.someProp = "MyValue;
})
// Subscribe to reply channel:
.on(MyReplyMessage, (m) => {
    if (m.status === "OK!") {
        alert("All good!");
    } else {
        alert("Something went wrong!");
    }
});
```

Or you can listen on a reply channel from the actual handler:

```
channel.on('Key.+', (m, replyChannel) => {
    replyChannel.publish(MyReplyMessage, (m: MyReplyMessage) { ... });
    replyChannel.on(MySecondReplyMessage, (m) => { ... } );
});
```

You can chain this to create a dialog between the handler and publisher with multiple messages going back and forth.

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
- It's now possible to get the message's name in a message handler by accessing the message's 'messageType' property. Example:

```
channel.on(".", (m) => {
  alert("Got a message of type " + (<any>m).messageType);
});
```    