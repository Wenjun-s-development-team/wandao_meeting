package types

type UserSave struct {
	Name   string `json:"name" uri:"name"`
	Passwd string `json:"passwd" uri:"passwd"`
}
