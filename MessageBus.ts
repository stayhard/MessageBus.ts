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

    export class Channel {

        private handlers = {};
        private queue = {};

        /**
         * @param isQueue If true, all published messages are saved and sent to future handlers as they are added. This is used on reply channels.
         * @param parentBus If set, any messages published on this bus will also get published on this bus.
         */
        constructor(private isQueue = false, private parentBus?: Channel) {

        }

        public on<T extends Message>(type: T, handler: (message: T, replyChannel: Channel) => void) : Channel {

            if (!(<any>type).messageType) {
                throw "Invalid message type. Missing messageType property.";
            }
            var msgType: string = (<any>type).messageType;

            if (!this.handlers[msgType]) {
                this.handlers[msgType] = [];
            }

            (<{ (message: T, replyChannel: Channel): void; }[]>this.handlers[msgType]).push(handler);

            // Send any queued messages to the handler
            if (this.isQueue && this.queue[msgType]) {
                this.queue[msgType].forEach((p)=> {
                    p(handler);
                });
            }

            return this;
        }

        public off<T extends Message>(type: T, handler: (message: T, replyChannel: Channel) => void) : Channel {

            if (!(<any>type).messageType) {
                throw "Invalid message type. Missing messageType property.";
            }
            var msgType: string = (<any>type).messageType;

            if (this.handlers[msgType]) {
                this.handlers[msgType] = (<{ (message: T, replyChannel: Channel): void }[]>this.handlers[msgType]).filter((h)=> h !== handler);
            }

            return this;
        }
        
        /**
         * Publishes a message on the bus and returns a new channel for listening on replies from subscribers. Messages published on this reply channel bubbles up to the main channel.
         */
        public publish<T extends Message>(messageDefinition: T, messageConstructor?: (msg: T) => void): ReplyChannel {
            var replyChannel = new ReplyChannel(true, this);

            this._publish(messageDefinition, messageConstructor, replyChannel);

            return replyChannel;
        }

        private _publish<T extends Message>(messageDefinition: T, messageConstructor: (msg: T) => void, replyChannel: Channel) : (h) => void {

            if (!(<any>messageDefinition).messageType) {
                throw "Invalid message type. Missing messageType property.";
            }
            
            var msgType: string = (<any>messageDefinition).messageType;
            Logging.getLogger().log("MessageBus: Publishing message - " + msgType);

            var publish = (h) => {

                // Create actual message for each handler
                var message = (<any>messageDefinition)();
                if (messageConstructor) {
                    messageConstructor(message);
                }

                // Pass message to handler
                try {
                    h(message, replyChannel);
                } catch (error) {
                    replyChannel.publish(UnexpectedExceptionMessage, (message: UnexpectedExceptionMessage) => {
                        message.exception = error;
                    });
                }
            };

            if (this.handlers[msgType]) {
                this.handlers[msgType].forEach(publish);
            }

            if (this.isQueue) {
                // Save to queue
                if (!this.queue[msgType]) {
                    this.queue[msgType] = [];
                }

                this.queue[msgType].push(publish);
            }
            
            if (this.parentBus instanceof Channel) {
                this.parentBus._publish(messageDefinition, messageConstructor, replyChannel);
            }

            return publish;
        }
    }

    export class ReplyChannel extends Channel {

    }

    export module Logging {

        var currentLogger: Logger;
        var nullLogger: Logger;

        class NullLogger implements Logger {
            public log(message: string) { }
        }

        export interface Logger {
            log(message: string);
        }

        export function setLogger(logger: Logger) {
            currentLogger = logger;
        }

        export function getLogger(): Logger {
            if (currentLogger) {
                return currentLogger;
            }
            if (!nullLogger) {
                nullLogger = new NullLogger();
            }
            return nullLogger;
        }
    }
}

