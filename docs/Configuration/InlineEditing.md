# Inline Editing in List View

Adminizer supports inline editing of fields directly in the list view. This allows administrators to quickly update values without navigating to the edit form.

## Overview

When inline editing is enabled for a field, users can double-click on a cell value in the table to edit it directly. Changes are saved via an API call and the table updates instantly without a full page reload.

## Enabling Inline Editing

To enable inline editing for a field, set the `inlineEditable` flag in the field configuration:

```ts
models: {
  Example: {
    title: 'Example',
    model: 'example',
    fields: {
      title: {
        title: 'Title',
        type: 'string',
        inlineEditable: true
      },
      isActive: {
        title: 'Active',
        type: 'boolean',
        inlineEditable: true
      },
      price: {
        title: 'Price',
        type: 'number',
        inlineEditable: true,
        inlineValidation: {
          min: 0,
          max: 99999
        }
      }
    }
  }
}
```

## Supported Field Types

Inline editing is only available for the following field types:

| Type | Control |
|------|---------|
| `string` | Text input |
| `integer` | Number input |
| `number` | Number input |
| `float` | Number input |
| `email` | Email input |
| `range` | Number input with min/max |
| `boolean` | Checkbox |

If `inlineEditable: true` is set on an unsupported field type (e.g., `text`, `date`, `json`), the flag is **ignored** and the field remains read-only.

## Conditions for Editing

A field is editable in the list view only when **all** of the following conditions are met:

| Condition | Description |
|-----------|-------------|
| `inlineEditable: true` | The flag must be explicitly set |
| No `displayModifier` | Fields with `displayModifier` are always read-only (priority) |
| Supported field type | The field type must be in the allowed list above |

## Validation

You can define validation rules for inline editing using the `inlineValidation` option:

```ts
fieldName: {
  title: 'Field Name',
  type: 'string',
  inlineEditable: true,
  inlineValidation: {
    minLength: 3,
    maxLength: 100,
    pattern: '^[a-zA-Z]+$',
    validate: (value) => value.trim().length > 0 || 'Value cannot be empty'
  }
}
```

### Validation Options

| Option | Description | Applicable Types |
|--------|-------------|------------------|
| `minLength` | Minimum string length | `string`, `email` |
| `maxLength` | Maximum string length | `string`, `email` |
| `min` | Minimum value | `integer`, `number`, `float`, `range` |
| `max` | Maximum value | `integer`, `number`, `float`, `range` |
| `pattern` | Regex pattern for validation | `string`, `email` |
| `validate` | Custom validation function | All types |

## User Interaction

### Text and Number Fields

1. **Double-click** on the cell value to start editing
2. An input field appears with the current value selected
3. Press **Enter** or click outside to save
4. Press **Escape** to cancel

### Boolean Fields

1. **Double-click** on the cell to start editing
2. A checkbox appears
3. Toggle the checkbox to change the value
4. Click outside the checkbox to save
5. Press **Escape** to cancel

## API Endpoint

Inline editing uses the following API endpoint:

```
PATCH /adminizer/model/:name/inline/:id
```

**Request body:**
```json
{
  "field": "fieldName",
  "value": "newValue"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "record-id",
    "field": "fieldName",
    "value": "newValue"
  }
}
```

## Example Configuration

```ts
import { AdminpanelConfig } from "adminizer";

const config: AdminpanelConfig = {
  routePrefix: "/admin",
  models: {
    Product: {
      title: 'Products',
      model: 'product',
      fields: {
        name: {
          title: 'Name',
          type: 'string',
          inlineEditable: true,
          inlineValidation: {
            minLength: 2,
            maxLength: 200
          }
        },
        price: {
          title: 'Price',
          type: 'number',
          inlineEditable: true,
          inlineValidation: {
            min: 0,
            max: 999999
          }
        },
        active: {
          title: 'Active',
          type: 'boolean',
          inlineEditable: true
        },
        email: {
          title: 'Contact Email',
          type: 'email',
          inlineEditable: true,
          inlineValidation: {
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
          }
        },
        // This field has displayModifier — inlineEditable will be ignored
        displayName: {
          title: 'Display Name',
          type: 'string',
          inlineEditable: true, // ← Ignored due to displayModifier
          displayModifier: (v) => v?.toUpperCase()
        }
      }
    }
  }
};
```
