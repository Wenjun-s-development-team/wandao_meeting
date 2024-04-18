package auth

import (
	"fmt"
	"wdmeeting/internal/utils/errutil"

	"github.com/pkg/errors"
)

type Type int

// Note: New type must append to the end of list to maintain backward compatibility.
const (
	None   Type = iota
	Plain       // 1
	LDAP        // 2
	SMTP        // 3
	PAM         // 4
	DLDAP       // 5
	GitHub      // 6
)

// Name returns the human-readable name for given authentication type.
func Name(typ Type) string {
	return map[Type]string{
		LDAP:   "LDAP (via BindDN)",
		DLDAP:  "LDAP (simple auth)", // Via direct bind
		SMTP:   "SMTP",
		PAM:    "PAM",
		GitHub: "GitHub",
	}[typ]
}

var _ errutil.NotFound = (*ErrBadCredentials)(nil)

type ErrBadCredentials struct {
	Args errutil.Args
}

// IsErrBadCredentials returns true if the underlying error has the type  ErrBadCredentials.
func IsErrBadCredentials(err error) bool {
	var errBadCredentials ErrBadCredentials
	ok := errors.As(errors.Cause(err), &errBadCredentials)
	return ok
}

func (err ErrBadCredentials) Error() string {
	return fmt.Sprintf("bad credentials: %v", err.Args)
}

func (ErrBadCredentials) NotFound() bool {
	return true
}

// ExternalAccount 第三方账号身份验证程序返回的信息。
type ExternalAccount struct {
	// REQUIRED: 第三方账号登录名
	Login string
	// REQUIRED: The username of the account.
	Name string
	// The full name of the account.
	FullName string
	// The email address of the account.
	Email string
	// The location of the account.
	Location string
	// The website of the account.
	Website string
	// Whether the user should be prompted as a site admin.
	Admin bool
}

// Provider defines an authenticate provider which provides ability to authentication against
// an external identity provider and query external account information.
type Provider interface {
	// Authenticate performs authentication against an external identity provider
	// using given credentials and returns queried information of the external account.
	Authenticate(login, password string) (*ExternalAccount, error)

	// Config returns the underlying configuration of the authenticate provider.
	Config() any
	// HasTLS returns true if the authenticate provider supports TLS.
	HasTLS() bool
	// UseTLS returns true if the authenticate provider is configured to use TLS.
	UseTLS() bool
	// SkipTLSVerify returns true if the authenticate provider is configured to skip TLS verify.
	SkipTLSVerify() bool
}
