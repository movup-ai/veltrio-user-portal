/**
 * Whether the API can email or text a renter their insurance link. Off until that endpoint
 * exists: offering Send email and Send text before then only produces failed requests.
 */
export const insuranceLinkDelivery = import.meta.env.VITE_INSURANCE_LINK_DELIVERY === 'true'
