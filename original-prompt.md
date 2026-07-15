# form seed browser extension
We are building a chrome extension
It is intended to fill forms
I want the forms to be filled based on the input type. Random values just fill them IDGAF

BUT! There needs to be a backing config that can be shared with colleagues.

## Acceptance criteria

- If the form is not configured fill it with random stuff based on the input type
- The extension should list every form on the current loaded dom if you click on the extension icon
  - I want the ability to save the current form values as a named fill
  - I also want the ability to configure value ranges for the inputs in the form
    - PER input I need to be able to override the primitive type for it
    - number needs to have a range, exclude values and how many decimals are allowed
    - text needs to have the ability to set predefined values for this field
  - This config needs to be saved and every time i visit this url and have this form I need to have the ability to have the form be seeded. This can thus be done with a named fill but also to seed based on the seed values. We will call that auto seeding
  - The form needs to have a nice icon for this. I want you to make an icon that perfectly catches the essence of this form seeder. Maybe a form with a sprouting seed of sorts?
  - I want this icon to show up for EVERY FORM in the top left corner so you can click it and fill the form based on the previous mentioned methods.
- Backing config which the user can view and import
  - The backing config needs to be in json

I want you to first create plans for this product from the following roles.
- Software architect
You than need to validate this plan by another of the same role. This reviewer needs to be very concise.

## Software Architect Plan

You need to adhere to SOLID, KISS, DRY principles and ensure that the architecture is simple, easy to understand, and maintainable.
