import {
  AddressParamsSchema,
  CreateBuyerAddressSchema,
  UpdateBuyerAddressSchema,
} from './address.dto';

describe('Buyer address DTO schemas', () => {
  it('normalizes valid address creation input', () => {
    const result = CreateBuyerAddressSchema.parse({
      contactName: ' Ada Buyer ',
      phoneNumber: '08012345678',
      state: ' Lagos ',
      city: ' Ikeja ',
      streetAddress: ' 12 Allen Avenue ',
      deliveryNotes: ' Call before delivery ',
      isDefault: true,
    });

    expect(result).toEqual({
      contactName: 'Ada Buyer',
      phoneNumber: '08012345678',
      state: 'Lagos',
      city: 'Ikeja',
      streetAddress: '12 Allen Avenue',
      deliveryNotes: 'Call before delivery',
      isDefault: true,
    });
  });

  it('rejects invalid phone numbers and empty update payloads', () => {
    expect(() =>
      CreateBuyerAddressSchema.parse({
        contactName: 'Ada Buyer',
        phoneNumber: '12345',
        state: 'Lagos',
        streetAddress: '12 Allen Avenue',
      }),
    ).toThrow();
    expect(() => UpdateBuyerAddressSchema.parse({})).toThrow();
  });

  it('validates UUID route params', () => {
    expect(
      AddressParamsSchema.parse({
        addressId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toEqual({ addressId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(() => AddressParamsSchema.parse({ addressId: 'bad-id' })).toThrow();
  });
});
