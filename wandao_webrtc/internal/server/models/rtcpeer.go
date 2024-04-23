package models

type IceCandidateEvent struct {
	SdpMLineIndex int    `json:"sdpMLineIndex"`
	Candidate     string `json:"candidate"`
}

type IceCandidateRequest struct {
	UserId       string                       `json:"userId"`
	IceCandidate map[string]IceCandidateEvent `json:"iceCandidate"`
}

type RTCSdpType struct {
	Sdp  string `json:"sdp"`
	Type string `json:"type"` // "answer" | "offer" | "pranswer" | "rollback"
}

type SessionDescriptionRequest struct {
	UserId             string                `json:"userId"`
	SessionDescription map[string]RTCSdpType `json:"sessionDescription"`
}

type RoomAction struct {
	Action   string `json:"action"`
	RoomId   uint64 `json:"roomId"`
	UserId   uint64 `json:"userId"`
	UserName string `json:"userName"`
	Password string `json:"password"`
}
