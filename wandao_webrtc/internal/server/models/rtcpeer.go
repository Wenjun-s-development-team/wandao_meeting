package models

type IceCandidateEvent struct {
	SdpMLineIndex int    `json:"sdpMLineIndex"`
	Candidate     string `json:"candidate"`
}

type IceCandidateRequest struct {
	UserId       uint64            `json:"userId"`
	IceCandidate IceCandidateEvent `json:"iceCandidate"`
}

type RTCSdpType struct {
	Sdp  string `json:"sdp"`
	Type string `json:"type"` // "answer" | "offer" | "pranswer" | "rollback"
}

type SessionDescriptionRequest struct {
	UserId             uint64     `json:"userId"`
	SessionDescription RTCSdpType `json:"sessionDescription"`
}

type RoomAction struct {
	Action   string `json:"action"`
	RoomId   uint64 `json:"roomId"`
	UserId   uint64 `json:"userId"`
	UserName string `json:"userName"`
	Password string `json:"password"`
}

type RoomStatus struct {
	Action string `json:"action"`
	RoomId uint64 `json:"roomId"`
	UserId uint64 `json:"userId"`
	Status bool   `json:"status"`
}
