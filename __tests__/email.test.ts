import Joi from 'joi';

describe("email testing", ()=> {
  it("should pass", ()=> {
    const emailValidator = Joi.string().email().required();
    const result = emailValidator.validate("test@test.mn");
    expect(result.error).toBeUndefined();

    const result2 = emailValidator.validate("\"test@test.mn\"".replace(/"/g, ''));
    console.log('error', result2.error);
    expect(result2.error).toBeUndefined();
  });
})