interface TestMessage extends MessageBus.Message {
	data: string;
}
var TestMessage = MessageBus.Message<TestMessage>("TestMessage");

interface TestMessage2 extends MessageBus.Message {
}
var TestMessage2 = MessageBus.Message<TestMessage2>("TestMessage2");

interface TestMessage3 extends MessageBus.Message {
}
var TestMessage3 = MessageBus.Message<TestMessage3>("TestMessage3");

describe('Channel', function(){
	describe('#publish()', function(){
		it('should send message to all subscribers', function(done){

			var channel = new MessageBus.Channel();

			channel.on(TestMessage, () => {
					done();
				});

			channel.publish(TestMessage);
		});
	});

	describe('#publish()', function(){
		it('should create a message for each subscriber', function(done){

			var doneCount = 0;
			var expectDone = (expect: number) => {
				if (++doneCount == expect) {
					done();
				}
			};

			var channel = new MessageBus.Channel();

			channel.on(TestMessage, (msg) => {
					msg.data.should.equal('testdata');
					msg.data = 'something else';
					expectDone(2);
				});
			channel.on(TestMessage, (msg) => {
					msg.data.should.equal('testdata');
					msg.data = 'something else';
					expectDone(2);
				});

			channel.publish(TestMessage, (msg) => {
					msg.data = 'testdata';
				});
		});
	});

	describe('#publish()', function(){
		it('should return a reply channel that emits (queued) messages published by subscribers', function(done){

			var channel = new MessageBus.Channel();

			channel.on(TestMessage, (m, reply) => { reply.publish(TestMessage2); });

			channel.publish(TestMessage).on(TestMessage2, (m, reply) => {
					done();
				});
		});
	});

	describe('#publish()', function(){
		it('should bubble up to root channel', function(done){

			var doneCount = 0;
			var expectDone = (expect: number) => {
				if (++doneCount == expect) {
					done();
				}
			};

			var channel = new MessageBus.Channel();

			channel.on(TestMessage, (m, reply) => {
					reply.publish(TestMessage2);
				});

			channel.on(TestMessage2, (m, reply) => {
					expectDone(2);
				});

			channel.publish(TestMessage)
				.on(TestMessage2, (m, reply) => {
					expectDone(2);
				});
		});
	});

	describe('ReplyChannel', function(){
		it('should only ever be one reply channel for each handler on root channel', function(done){

			var doneCount = 0;
			var expectDone = (expect: number) => {
				if (++doneCount == expect) {
					done();
				}
			};

			var channel = new MessageBus.Channel();

			channel.on(TestMessage, (m, reply) => {
					reply.on(TestMessage2, (m2, reply2) => {
						reply2.on(TestMessage3, () => {
							done();
						});
					});
				});

			var replyChannel = channel.publish(TestMessage);
			replyChannel.publish(TestMessage2);
			replyChannel.publish(TestMessage3);
		});
	});

	describe('ReplyChannel', function(){
		it('should not get messages published on root channel', function(done){

			var channel = new MessageBus.Channel();

			channel.on(TestMessage, (m, reply) => {
				reply.on(TestMessage2, () => {
					done(new Error("Failed"));
				});
			});

			channel.publish(TestMessage);
			channel.publish(TestMessage2);

			done();
		});
	});

	describe('#on()', function(){
		it('should match string patterns as regex', function(done){

			var channel = new MessageBus.Channel();

			channel.on("Test$", (m, reply) => {
					done(new Error("Failed"));
				});

			channel.on("^Test", (m, reply) => {
					done();
				});

			channel.publish(TestMessage);
		});
	});
});

describe('Message', function(){

	describe('instanceof', function(){
		it('should return true if same type of message', function(done){

			var channel = new MessageBus.Channel();

			channel.on(TestMessage, (m) => {
				(m instanceof <any>TestMessage).should.equal(true);
				(m instanceof <any>TestMessage2).should.equal(false);
				done();
			});

			channel.publish(TestMessage);
		});
	});

	describe('#messageType', function(){
		it('should return the name of the message', function(done){

			var channel = new MessageBus.Channel();

			channel.on('.', (m) => {
				(<any>m).messageType.should.equal("TestMessage");
				done();
			});

			channel.publish(TestMessage);
		});
	});

});