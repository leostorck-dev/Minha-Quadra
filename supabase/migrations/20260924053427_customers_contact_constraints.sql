alter table public.customers
  drop constraint customers_contact_required,
  add constraint customers_contact_required
    check (
      nullif(trim(phone), '') is not null
      or nullif(trim(email), '') is not null
    ),
  add constraint customers_phone_valid
    check (
      phone is null
      or (
        phone ~ '^[+0-9 ()-]+$'
        and length(regexp_replace(phone, '[^0-9]', '', 'g')) between 8 and 15
      )
    ),
  add constraint customers_email_valid
    check (
      email is null
      or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    );
