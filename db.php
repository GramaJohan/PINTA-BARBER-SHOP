<?php
$conexion = new mysqli("localhost", "root", "", "pinta_barber_shop");

if ($conexion->connect_errno) {
    die("Error en conexión: " . $conexion->connect_error);
}
?>
