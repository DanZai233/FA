package app

import "errors"

var (
	ErrPolyOathInvalid              = errors.New("poly mode requires oath: 我是渣男 or 我是渣女")
	ErrExclusiveTooManyPartners     = errors.New("unlink extra partners before switching to exclusive mode")
	ErrTargetPartnerRequired        = errors.New("targetPartnerId required when linked with multiple partners")
	ErrTargetPartnerNotLinked       = errors.New("targetPartnerId is not a linked partner")
	ErrInvalidRelationshipModeValue = errors.New("relationshipMode must be exclusive or poly")
)

const (
	RelationshipExclusive = "exclusive"
	RelationshipPoly      = "poly"
)

const (
	PolyOathMale   = "我是渣男"
	PolyOathFemale = "我是渣女"
)

func effectiveRelationshipMode(u User) string {
	if u.RelationshipMode == RelationshipPoly {
		return RelationshipPoly
	}
	return RelationshipExclusive
}

func isPolyUser(u User) bool {
	return effectiveRelationshipMode(u) == RelationshipPoly
}
