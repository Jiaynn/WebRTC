'use strict';
// 传输视频，不传输音频
const mediaStreamConstraints = {
  video: true,
  audio: false
};

// 设置只交换视频
const offerOptions = {
  offerToReceiveVideo: 1,
};

let startTime = null;

// 设置两个video，分别显示本地视频流和远端视频流
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;
// 建立两个对等连接对象，分表代表本地和远端
let localPeerConnection;
let remotePeerConnection;



function gotLocalMediaStream(mediaStream) {
localVideo.srcObject = mediaStream;
localStream = mediaStream;
trace('Received local stream.');
callButton.disabled = false; 
}

function handleLocalMediaStreamError(error) {
trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

function gotRemoteMediaStream(event) {
const mediaStream = event.stream;
remoteVideo.srcObject = mediaStream;
remoteStream = mediaStream;
trace('Remote peer connection received remote stream.');
}

function logVideoLoaded(event) {
const video = event.target;
trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
    `videoHeight: ${video.videoHeight}px.`);
}

function logResizedVideo(event) {
logVideoLoaded(event);
if (startTime) {
const elapsedTime = window.performance.now() - startTime;
startTime = null;
trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
}
}

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('onresize', logResizedVideo);

//交换网络信息，处理A和B连接问题
function handleConnection(event) {
const peerConnection = event.target;
const iceCandidate = event.candidate;

if (iceCandidate) {
const newIceCandidate = new RTCIceCandidate(iceCandidate);
const otherPeer = getOtherPeer(peerConnection);

otherPeer.addIceCandidate(newIceCandidate)
  .then(() => {
    handleConnectionSuccess(peerConnection);
  }).catch((error) => {
    handleConnectionFailure(peerConnection, error);
  });

trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
      `${event.candidate.candidate}.`);
}
}

function handleConnectionSuccess(peerConnection) {
trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
};

function handleConnectionFailure(peerConnection, error) {
trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n`+
    `${error.toString()}.`);
}

function handleConnectionChange(event) {
const peerConnection = event.target;
console.log('ICE state change event: ', event);
trace(`${getPeerName(peerConnection)} ICE state: ` +
    `${peerConnection.iceConnectionState}.`);
}

function setSessionDescriptionError(error) {
trace(`Failed to create session description: ${error.toString()}.`);
}

function setDescriptionSuccess(peerConnection, functionName) {
const peerName = getPeerName(peerConnection);
trace(`${peerName} ${functionName} complete.`);
}

function setLocalDescriptionSuccess(peerConnection) {
  //将描述通过信令发送给B
setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

function setRemoteDescriptionSuccess(peerConnection) {
setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

//创建offer成功，获取 RTCSessionDescription 类型的 SDP 信息
function createdOffer(description) {
trace(`Offer from localPeerConnection:\n${description.sdp}`);

trace('localPeerConnection setLocalDescription start.');
//设置成自己的本地会话描述
localPeerConnection.setLocalDescription(description)
.then(() => {
  //将描述通过信令通道发送给B
  setLocalDescriptionSuccess(localPeerConnection);
}).catch(setSessionDescriptionError);

trace('remotePeerConnection setRemoteDescription start.');
//B使用setRemoteDescription将A发送过来的米哦啊叔设置成自己的远端描述
remotePeerConnection.setRemoteDescription(description)
.then(() => {
  
  setRemoteDescriptionSuccess(remotePeerConnection);
}).catch(setSessionDescriptionError);

trace('remotePeerConnection createAnswer start.');

//B运行RTCPeerConnection的createAnswer()方法，可以产生一个相匹配的描述，B将自己产生的描述设置为本地描述并且发送给A
remotePeerConnection.createAnswer()
.then(createdAnswer)
.catch(setSessionDescriptionError);
}

function createdAnswer(description) {
trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

trace('remotePeerConnection setLocalDescription start.');
//B将自己产生的描述设置为本地描述
remotePeerConnection.setLocalDescription(description)
.then(() => {
  //发送给A
  setLocalDescriptionSuccess(remotePeerConnection);
}).catch(setSessionDescriptionError);

trace('localPeerConnection setRemoteDescription start.');
//A将其设置为自己的远端描述
localPeerConnection.setRemoteDescription(description)
.then(() => {
  setRemoteDescriptionSuccess(localPeerConnection);
}).catch(setSessionDescriptionError);
}

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;

//点击开始按钮，获取本地的视频流并展示在本地的video框中
function startAction() {
startButton.disabled = true;
navigator.getUserMedia(mediaStreamConstraints, gotLocalMediaStream, handleLocalMediaStreamError)
trace('Requesting local stream.');
}
// 创建对等连接
//点击呼叫按钮，创建对等链接
function callAction() {
callButton.disabled = true;
hangupButton.disabled = false;

trace('Starting call.');
startTime = window.performance.now();

//在获取到的本地流中取出音频轨道和视频轨道
const videoTracks = localStream.getVideoTracks();
const audioTracks = localStream.getAudioTracks();

if (videoTracks.length > 0) {
trace(`Using video device: ${videoTracks[0].label}.`);
}
if (audioTracks.length > 0) {
trace(`Using audio device: ${audioTracks[0].label}.`);
}

// 服务器配置
const servers = null; 

//本地的创建RTCPeerConnection对象
localPeerConnection = new RTCPeerConnection(servers);
trace('Created local peer connection object localPeerConnection.');

//A和B需要交换网络信息，通过ICE框架查找网络接口和端口
localPeerConnection.addEventListener('icecandidate', handleConnection);
localPeerConnection.addEventListener(
'iceconnectionstatechange', handleConnectionChange);

//远端建立RTCPeerConnection对象
remotePeerConnection = new RTCPeerConnection(servers);
trace('Created remote peer connection object remotePeerConnection.');

remotePeerConnection.addEventListener('icecandidate', handleConnection);
remotePeerConnection.addEventListener(
'iceconnectionstatechange', handleConnectionChange);
remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

//在连接中，添加本地的视频流
localPeerConnection.addStream(localStream);
trace('Added local stream to localPeerConnection.');

trace('localPeerConnection createOffer start.');

//本地的建立sdp信息，创建offer
localPeerConnection.createOffer(offerOptions)
.then(createdOffer).catch(setSessionDescriptionError);
}


function hangupAction() {
localPeerConnection.close();
remotePeerConnection.close();
localPeerConnection = null;
remotePeerConnection = null;
hangupButton.disabled = true;
callButton.disabled = false;
trace('Ending call.');
}

startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);

function getOtherPeer(peerConnection) {
return (peerConnection === localPeerConnection) ?
  remotePeerConnection : localPeerConnection;
}

function getPeerName(peerConnection) {
return (peerConnection === localPeerConnection) ?
  'localPeerConnection' : 'remotePeerConnection';
}

//追踪
//window.performance.now()返回的时间戳没有被限制在一毫秒的精确度内，相反，它们以浮点数的形式表示时间，精度最高可达微秒级。
function trace(text) {
text = text.trim();
const now = (window.performance.now() / 1000).toFixed(3);
console.log(now, text);
}