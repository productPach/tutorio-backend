FROM mongo:4

ENV MONGO_INITDB_ROOT_USERNAME=monty
ENV MONGO_INITDB_ROOT_PASSWORD=pass
ENV MONGO_INITDB_DATABASE=mongo
ENV MONGO_REPLICA_HOST=localhost
ENV MONGO_REPLICA_PORT=27017

# Вступаем во владение стандартным началом и запускаем mongo в режиме реплики
ENTRYPOINT ["/bin/bash", "-c", "\
    mongod --port $MONGO_REPLICA_PORT --replSet rs0 --bind_ip 0.0.0.0 & \
    MONGOD_PID=$!; \
    # Подготавливаем реплику с одним узлом и настраиваем конфигурацию root пользователя \
    INIT_REPL_CMD=\"rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '$MONGO_REPLICA_HOST:$MONGO_REPLICA_PORT' }] })\"; \
    # Ждем готовности реплики и затем выполняем команду выше \
    while ! mongo --port $MONGO_REPLICA_PORT --eval \"quit(db.runCommand({ ping: 1 }).ok ? 0 : 2)\"; do sleep 1; done; \
    mongo admin --port $MONGO_REPLICA_PORT --eval \"$INIT_REPL_CMD\"; \
    echo \"REPLICA SET ONLINE\"; \
    wait $MONGOD_PID; \
    "]