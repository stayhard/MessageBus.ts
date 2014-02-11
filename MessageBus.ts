/**
 * MessageBus.js - Client side message bus for TypeScript projects.
 *
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Stayhard AB
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

 module MessageBus {

    export interface Message {

    }

    export function Message<T>(name: string): T {
            var definition = function () {
                function F() { }

                F.prototype = definition.prototype;
                return new F();
            };
            (<any>definition).messageType = name;
            return <any>definition;
        };

    export interface UnexpectedExceptionMessage extends Message {
        exception: any;
    }
    export var UnexpectedExceptionMessage = Message<UnexpectedExceptionMessage>("UnexpectedExceptionMessage");

    class Subscription {

        private regex: RegExp;

        constructor (private pattern: string, public handler: (message: Message, replyChannel: Channel) => void) {
            this.regex = new RegExp(pattern);
        }

        public getPattern(): string {
            return this.pattern;
        }

        public isMatch(messageType: string) {
            return this.regex.test(messageType);
        }
    }

    class ChannelSubscriptions {

        private subscriptions: Subscription[] = [];

        public add(pattern: string, handler: (message: Message, replyChannel: Channel) => void) : Subscription {
            var subscription = new Subscription(pattern, handler);
            this.subscriptions.push(subscription);
            return subscription;
        }

        public remove(pattern: string, handler: (message: Message, replyChannel: Channel) => void) {
            this.subscriptions = this.subscriptions.filter((s)=> s.getPattern() !== pattern && s.handler !== handler);
        }

        /**
         * Iterates over all the contained subscriptions and calls the specified callback.
         * @param callback A callback to call for each subscription.
         */
        public forEach(callback: (subscription: Subscription) => void) {
            this.subscriptions.forEach(callback);
        }

        public createCallback(messageDefinition: Message, messageConstructor: (msg: Message) => void, replyChannel: ReplyChannel) {
            return (s) => {
                var messageType: string = (<any>messageDefinition).messageType;

                if (!s.isMatch(messageType)) {
                    // This subscription should not handle this message.
                    return;
                }

                // Create actual message for each handler
                var message = (<any>messageDefinition)();
                if (messageConstructor) {
                    messageConstructor(message);
                }

                // Pass message to handler
                try {
                    s.handler(message, replyChannel);
                } catch (error) {
                    replyChannel.publish(UnexpectedExceptionMessage, (message: UnexpectedExceptionMessage) => {
                        message.exception = error;
                    });
                };
            };
        }

    }

    /**
     * Returns the regex pattern for the specified input used to match handlers with message type names.
     */
    function toPattern(input: any) {
        if (typeof input === 'string') {
            return input;
        }

        if (!(<any>input).messageType) {
            throw "Invalid message type. Missing messageType property.";
        }
        return '^' + (<any>input).messageType + '$';
    };

    export class Channel {

        private subscriptions: ChannelSubscriptions = new ChannelSubscriptions();

        constructor() {

        }

        public on(pattern: string, handler: (message: Message, replyChannel: Channel) => void) : Channel;
        public on<T extends Message>(type: T, handler: (message: T, replyChannel: Channel) => void) : Channel {
            var pattern: string = toPattern(type);
            this.subscriptions.add(pattern, handler);
            return this;
        }

        public off(pattern: string, handler: (message: Message, replyChannel: Channel) => void) : Channel;
        public off<T extends Message>(type: T, handler: (message: T, replyChannel: Channel) => void) : Channel {
            var pattern: string = toPattern(type);
            this.subscriptions.remove(pattern, handler);
            return this;
        }
        
        /**
         * Publishes a message on the bus and returns a new channel for listening on replies from subscribers. Messages published on this reply channel bubbles up to the main channel.
         */
        public publish<T extends Message>(messageDefinition: T, messageConstructor?: (msg: T) => void): ReplyChannel {
            var replyChannel = new ReplyChannel(this);

            
            if (!(<any>messageDefinition).messageType) {
                throw "Invalid message type. Missing messageType property.";
            }
            
            var callback = this.subscriptions.createCallback(messageDefinition, messageConstructor, replyChannel);
            this.subscriptions.forEach(callback);

            return replyChannel;
        }
    }

    export class ReplyChannel {

        private subscriptions: ChannelSubscriptions = new ChannelSubscriptions();
        private queue = [];

        constructor(private rootChannel: Channel) {

        }

        public on(pattern: string, handler: (message: Message, replyChannel: Channel) => void) : ReplyChannel;
        public on<T extends Message>(type: T, handler: (message: T, replyChannel: Channel) => void) : ReplyChannel {

            var pattern: string = toPattern(type);

            var subscription = this.subscriptions.add(pattern, handler);

            // Send any queued messages to the handler
            this.queue.forEach((p)=> {
                p(subscription);
            });

            return this;
        }

        public off(pattern: string, handler: (message: Message, replyChannel: Channel) => void) : ReplyChannel;
        public off<T extends Message>(type: T, handler: (message: T, replyChannel: Channel) => void) : ReplyChannel {
            var pattern: string = toPattern(type);
            this.subscriptions.remove(pattern, handler);
            return this;
        }
        
        /**
         * Publishes a message on the bus and returns a new channel for listening on replies from subscribers. Messages published on this reply channel bubbles up to the main channel.
         */
        public publish<T extends Message>(messageDefinition: T, messageConstructor?: (msg: T) => void): ReplyChannel {
            
            if (!(<any>messageDefinition).messageType) {
                throw "Invalid message type. Missing messageType property.";
            }
            
            var callback = this.subscriptions.createCallback(messageDefinition, messageConstructor, this);
            this.subscriptions.forEach(callback);

            // Save to queue
            this.queue.push(callback);
            
            if (this.rootChannel) {
                this.rootChannel.publish(messageDefinition, messageConstructor);
            }

            return this;
        }
    }
}

