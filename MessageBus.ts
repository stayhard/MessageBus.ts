/**
 *  MessageBus.js - Client side message bus for TypeScript projects.
 *  Copyright (C) 2014 Stayhard AB

 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.

 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.

 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
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

