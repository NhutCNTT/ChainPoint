// Run only against an isolated audit virtual host with the application worker disabled.
import assert from 'node:assert/strict';
const origin=process.env.RABBITMQ_MANAGEMENT_URL || 'http://localhost:15672';
const vhost=process.env.RABBITMQ_VHOST;
assert.ok(vhost && vhost !== '/', 'Set RABBITMQ_VHOST to an isolated audit virtual host.');
const authorization='Basic '+Buffer.from(`${process.env.RABBITMQ_USERNAME || 'guest'}:${process.env.RABBITMQ_PASSWORD || 'guest'}`).toString('base64');
async function api(url,body) {
 const response=await fetch(origin+'/api/'+url,{method:body?'POST':'GET',headers:{Authorization:authorization,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 assert.ok(response.ok,`RabbitMQ management returned ${response.status}`);
 return response.json();
}
const host=encodeURIComponent(vhost), queue='blockchain.loyalty.v2.queue', dlq='blockchain.loyalty.dlq';
const info=await api(`queues/${host}/${queue}`);
assert.equal(info.messages,0,'Audit queue must be empty before the probe');
assert.equal(info.consumers,0,'Disable the worker while testing broker rejection routing');
assert.equal(info.arguments['x-dead-letter-exchange'],'chainpoint.event.dlx');
const before=await api(`queues/${host}/${dlq}`);
assert.equal(before.messages,0,'Audit DLQ must be empty before the probe');
const probe=JSON.stringify({billCode:'DLQ-VERIFICATION-'+Date.now()});
const result=await api(`exchanges/${host}/chainpoint.event.exchange/publish`,{properties:{content_type:'application/json'},routing_key:'chainpoint.checkout.v2.success',payload:probe,payload_encoding:'string'});
assert.equal(result.routed,true);
const rejected=await api(`queues/${host}/${queue}/get`,{count:1,ackmode:'reject_requeue_false',encoding:'auto'});
assert.equal(rejected[0].payload,probe);
let dead=[];
for(let attempt=0;attempt<10 && !dead.length;attempt++) {
 dead=await api(`queues/${host}/${dlq}/get`,{count:1,ackmode:'ack_requeue_false',encoding:'auto'});
}
assert.equal(dead[0]?.payload,probe);
assert.equal(dead[0].properties.headers['x-death'][0].reason,'rejected');
console.log('PASS: durable v2 queue routed a rejected message through the dead-letter exchange into blockchain.loyalty.dlq; probe consumed from isolated audit DLQ.');
