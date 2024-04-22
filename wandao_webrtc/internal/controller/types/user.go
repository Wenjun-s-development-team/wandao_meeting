package types

type UserLogin struct {
	Name   string `json:"name"`
	Passwd string `json:"passwd"`
}

type UserMessage struct {
	RoomId  uint64 `json:"roomId"`
	UserId  uint64 `json:"userId"`
	MsgId   string `json:"msgId"`
	Message string `json:"message,omitempty"`
}

type UserQuery struct {
	RoomId uint64 `json:"roomId" uri:"roomId"`
}
