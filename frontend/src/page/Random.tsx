import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import shortid from "shortid";

const Random = () => {
  const [socket, setS] = useState<WebSocket | null>(null);
  const [ready, setReady] = useState(false);
  //const [video, setVideo] = useState(true);
  //const [audio, setAudio] = useState(true);
  const [text, setText] = useState("");
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>();
  const otherRef = useRef(null);
  const yourRef = useRef(null);
  const getMedia = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        //@ts-ignore
        yourRef.current.srcObject = stream;
        //@ts-ignore
        yourRef.current.play();
        setStream(stream);
      });
  };
  useEffect(() => {
    //create an instance of RTCPeerConnection
    const pcc = new RTCPeerConnection();
    setPc(pcc);
    //create a random and unique id for user
    const idd = shortid.generate();
    setId(idd);
    //get use media
    getMedia();
    //create websocket connection and wait for events triggered by backend
    const sock = new WebSocket(`ws:localhost:8000`);
    setS(sock);
    sock.onopen = () => {};
    sock.addEventListener("message", (data) => {
      const message = JSON.parse(data.data);
      switch (message.type) {
        case "createOffer":
          pcc.onnegotiationneeded = async () => {
            const offer = await pcc.createOffer();
            await pcc.setLocalDescription(offer);
            sock.send(
              JSON.stringify({
                type: "createOffer",
                to: message.sendTo,
                offer,
              })
            );
            pcc.onicecandidate = (event) => {
              if (event.candidate) {
                socket?.send(
                  JSON.stringify({
                    type: "iceCandidate",
                    by: "sender",
                    candidate: event.candidate,
                    to: message.sendTo,
                    from: id,
                  })
                );
              }
            };
          };
          return;
        case "createAns":
          pcc.setRemoteDescription(message.offer);
          pcc.createAnswer().then((answer) => {
            pcc.setLocalDescription(answer);
            sock.send(
              JSON.stringify({
                type: "createAns",
                answer,
                to: message.from,
              })
            );
          });
          return;
        case "getAns":
          pcc.setRemoteDescription(message.ans);
          return;
        case "iceCandidate":
          (async function () {
            // code to be executed immediately
            await pcc.addIceCandidate(message.candidate);
          })();
          console.log("iceCandidateee");
          if (message.by == "sender") {
            console.log("candidate from sender.");
            pcc.onicecandidate = (event) => {
              if (event.candidate) {
                sock.send(
                  JSON.stringify({
                    type: "iceCandidate",
                    by: "not",
                    candidate: event.candidate,
                    to: message.from,
                  })
                );
              }
            };
          } else {
            console.log("reciver's icecandidate");
            stream?.getTracks().forEach((track) => {
              pcc.addTrack(track);
            });
          }
          return;

        default:
          console.log("on default type", message);
      }
    });
    pcc.ontrack = (event: any) => {
      console.log("getting tracks", event.track);
      //@ts-ignore
      otherRef.current.srcObject = new MediaStream([event.track]);
      //@ts-ignore
      otherRef.current.play();
    };
    stream?.getTracks().forEach((track) => {
      console.log("sending track to remote user");
      pcc.addTrack(track);
    });
    return () => {
      // Cleanup: Stop all tracks when the component unmounts
      stopStream();
    };
  }, []);
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };
  return (
    <div className="min-h-1/2 flex flex-col gap-3 mt-2">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="">
          {otherRef.current ? (
            <video
              ref={otherRef}
              height="520"
              width="630"
              className="rounded-xl"
            />
          ) : (
            <div className="flex items-center justify-centre">
              <p>Loading...</p>
            </div>
          )}
          <p>Random</p>
        </div>
        <div className="flex flex-col">
          <video
            className="rounded-xl"
            height="520"
            width="630"
            ref={yourRef}
          />
          <p>You</p>
        </div>
      </div>
      <div className=" flex gap-4 items-center">
        <Button
          variant={"destructive"}
          onClick={(e) => {
            e.preventDefault();
            socket?.send(
              JSON.stringify({
                type: "leaveGroup",
                id: id,
              })
            );
          }}
        >
          next
        </Button>
        <Button
          onClick={(e) => {
            e.preventDefault();
            if (ready) {
              setReady(false);
              socket?.send(
                JSON.stringify({
                  type: "notReady",
                  id: id,
                })
              );
            } else {
              setReady(true);
              if (socket) {
                console.log("socket is ready");
              }
              socket?.send(
                JSON.stringify({
                  type: "ready",
                  id: id,
                })
              );
            }
          }}
        >
          {ready ? "stop" : "start"}
        </Button>
        {/* {audio ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
            onClick={() => {
              setAudio(false);
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-6 h-6"
            onClick={() => {
              setAudio(true);
            }}
          >
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
            />
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        )} */}
        {/* {video ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
            onClick={() => {
              setVideo(false);
              stopStream();
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
            onClick={() => {
              setVideo(true);
              getMedia();
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
            />
          </svg>
        )} */}
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-[100px] border border-gray-300 rounded-xl overflow-y-scroll"></div>
        <div className="flex md:flex-row flex-col items-center gap-3">
          <Input
            className="flex-1 px-2 py-1 rounded-xl"
            placeholder="enter text"
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
          <Button className="rounded-xl" variant={"destructive"}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Random;
