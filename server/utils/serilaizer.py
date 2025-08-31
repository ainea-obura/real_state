def flatten_errors(errors):
    messages = []
    for field, msgs in errors.items():
        if isinstance(msgs, (list, tuple)):
            for msg in msgs:
                messages.append(f"{field}: {msg}")
        else:
            messages.append(f"{field}: {msgs}")
    return " ".join(messages)