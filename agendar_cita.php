<?php
include 'db.php';

$nombre = $_POST['nombre'];
$telefono = $_POST['telefono'];
$servicio = $_POST['servicio'];
$fecha = $_POST['fecha'];
$hora = $_POST['hora'];

// Insertar cliente
$conexion->query("INSERT INTO clientes (nombre, telefono) VALUES ('$nombre', '$telefono')");
$cliente_id = $conexion->insert_id;

// Tomar precio del servicio
$res = $conexion->query("SELECT precio FROM servicios WHERE id = $servicio");
$precio = $res->fetch_assoc()['precio'];

// Validar si la hora ya está ocupada
$validar = $conexion->query("
    SELECT * FROM citas 
    WHERE fecha='$fecha' AND hora='$hora'
");

if ($validar->num_rows > 0) {
    echo json_encode(["status" => "error", "msg" => "Esa hora ya está ocupada"]);
    exit;
}

// Registrar cita
$conexion->query("
    INSERT INTO citas (cliente_id, servicio_id, fecha, hora, precio_final)
    VALUES ($cliente_id, $servicio, '$fecha', '$hora', $precio)
");

echo json_encode(["status" => "ok", "msg" => "Cita registrada correctamente"]);
?>
